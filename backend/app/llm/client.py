"""LLM abstraction layer.

All LLM-based agents depend on the `LLMClient` protocol, never on a
specific provider. This lets us swap NVIDIA NIM (primary), Ollama
(fallback), or a stub (tests) via a single env var. See
docs/08_LANGGRAPH_SPEC.md.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Protocol, Type, runtime_checkable

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from app.core.config import settings

logger = logging.getLogger("serein_datahub.llm")


# --- Shared response types -------------------------------------------------


class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMResponse(BaseModel):
    text: str
    parsed: BaseModel | None = None
    usage: TokenUsage | None = None
    latency_ms: int = 0
    provider: str
    model: str


# --- Protocol --------------------------------------------------------------


@runtime_checkable
class LLMClient(Protocol):
    """Provider-agnostic LLM client used by all LLM-based agents."""

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Type[BaseModel] | None = None,
    ) -> LLMResponse:
        ...


# --- OpenAI-compatible base (NIM + Ollama share this) ----------------------


class _OpenAICompatibleClient:
    """Shared impl for any OpenAI-compatible endpoint (NIM, Ollama, others)."""

    provider: str = "openai-compatible"

    def __init__(self, *, model: str, base_url: str, api_key: str) -> None:
        self._model = model
        self._client = AsyncOpenAI(base_url=base_url, api_key=api_key or "stub")

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Type[BaseModel] | None = None,
    ) -> LLMResponse:
        start = time.monotonic()
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]
        kwargs: dict = {
            "model": self._model,
            "messages": messages,
            "temperature": settings.LLM_TEMPERATURE,
            "timeout": settings.LLM_TIMEOUT_SECONDS,
        }
        if response_format is not None:
            # Request strict JSON so we can parse into the Pydantic model.
            kwargs["response_format"] = {"type": "json_object"}

        try:
            completion = await self._client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001 - never raise to agents
            logger.warning("%s completion failed: %s", self.provider, exc)
            return LLMResponse(
                text="",
                usage=None,
                latency_ms=int((time.monotonic() - start) * 1000),
                provider=self.provider,
                model=self._model,
            )

        text = completion.choices[0].message.content or ""
        usage = None
        if completion.usage is not None:
            usage = TokenUsage(
                prompt_tokens=completion.usage.prompt_tokens or 0,
                completion_tokens=completion.usage.completion_tokens or 0,
                total_tokens=completion.usage.total_tokens or 0,
            )

        parsed: BaseModel | None = None
        if response_format is not None and text:
            parsed = _safe_parse(text, response_format)

        return LLMResponse(
            text=text,
            parsed=parsed,
            usage=usage,
            latency_ms=int((time.monotonic() - start) * 1000),
            provider=self.provider,
            model=self._model,
        )


def _safe_parse(text: str, model: Type[BaseModel]) -> BaseModel | None:
    """Best-effort parse of an LLM JSON string into a Pydantic model."""
    # Strip code fences if the model wrapped JSON in ```json ... ```
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:]
        stripped = stripped.strip()
    try:
        return model.model_validate_json(stripped)
    except (ValidationError, json.JSONDecodeError) as exc:
        logger.warning("LLM JSON parse failed: %s | text head: %r", exc, stripped[:200])
        return None


# --- Concrete providers ----------------------------------------------------


class NIMClient(_OpenAICompatibleClient):
    """NVIDIA NIM (build.nvidia.com) — primary provider."""

    provider = "nim"

    def __init__(self, *, model: str | None = None, api_key: str | None = None) -> None:
        super().__init__(
            model=model or settings.LLM_MODEL,
            base_url=settings.NIM_BASE_URL,
            api_key=api_key if api_key is not None else settings.NVIDIA_API_KEY,
        )


class OllamaClient(_OpenAICompatibleClient):
    """Local Ollama — fallback provider."""

    provider = "ollama"

    def __init__(self, *, model: str | None = None, base_url: str | None = None) -> None:
        super().__init__(
            model=model or settings.LLM_MODEL,
            base_url=base_url or settings.OLLAMA_BASE_URL,
            api_key="ollama",  # Ollama ignores the key but the SDK requires non-empty
        )


# --- Stub for tests / offline demo ----------------------------------------


class StubLLMClient:
    """Deterministic LLM stub. Returns canned responses keyed by a tag in the
    system prompt (e.g. "[PLANNER]"). Lets agents run end-to-end with no network.
    """

    provider = "stub"
    _model = "stub-model"

    def __init__(self, responses: dict[str, str] | None = None) -> None:
        # Default canned responses cover every LLM-based agent with sensible
        # JSON shapes so the pipeline completes end-to-end offline.
        self._responses = responses or _DEFAULT_STUB_RESPONSES

    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: Type[BaseModel] | None = None,
    ) -> LLMResponse:
        start = time.monotonic()
        text = self._match(system_prompt)
        parsed: BaseModel | None = None
        if response_format is not None and text:
            parsed = _safe_parse(text, response_format)
        return LLMResponse(
            text=text,
            parsed=parsed,
            usage=TokenUsage(prompt_tokens=0, completion_tokens=0, total_tokens=0),
            latency_ms=int((time.monotonic() - start) * 1000),
            provider=self.provider,
            model=self._model,
        )

    def _match(self, system_prompt: str) -> str:
        for tag, response in self._responses.items():
            if tag in system_prompt:
                return response
        # Fallback: empty JSON object so structured parse yields None gracefully.
        return "{}"


_DEFAULT_STUB_RESPONSES: dict[str, str] = {
    "[PLANNER]": json.dumps(
        {
            "summary": "A downstream dashboard stopped updating after a recent deployment.",
            "severity": "HIGH",
            "affected_assets": ["urn:li:dataset:(urn:li:dataPlatform:postgres,analytics.sales_data,PROD)"],
            "required_context": ["SCHEMA", "LINEAGE", "OWNERSHIP", "DEPLOYMENTS"],
            "hypotheses": [
                "A column referenced by the dashboard was renamed or removed.",
                "An upstream pipeline stopped writing to the source table.",
            ],
            "steps": [
                "Fetch schema for analytics.sales_data",
                "Fetch lineage around the dashboard",
                "Compare recent schema changes against dashboard expectations",
            ],
        }
    ),
    "[ROOT_CAUSE]": json.dumps(
        {
            "root_cause": "Column 'revenue' was renamed to 'amount' on 2026-08-04; the dashboard and dbt model still reference 'revenue'.",
            "confidence": 0.85,
            "evidence": [
                {
                    "asset_urn": "urn:li:dataset:(urn:li:dataPlatform:postgres,analytics.sales_data,PROD)",
                    "fact": "Schema last modified 2026-08-04; column 'revenue' absent, 'amount' present.",
                    "source": "DataHub schema",
                },
                {
                    "asset_urn": "urn:li:dataset:(urn:li:dataPlatform:dbt,analytics.fct_sales,PROD)",
                    "fact": "Downstream dbt model still selects revenue; lineage shows it depends on sales_data.",
                    "source": "DataHub lineage",
                },
            ],
            "affected_assets": [
                "urn:li:dataset:(urn:li:dataPlatform:postgres,analytics.sales_data,PROD)",
                "urn:li:dataset:(urn:li:dataPlatform:dbt,analytics.fct_sales,PROD)",
            ],
            "rejected_hypotheses": ["Upstream pipeline failure: no recent pipeline runs failed."],
            "recommended_fix_type": "SQL",
        }
    ),
    "[FIX_GENERATOR]": json.dumps(
        {
            "fix_type": "SQL",
            "title": "Align dbt fct_sales model with renamed revenue column",
            "description": "Update the fct_sales dbt model to reference 'amount' instead of the renamed 'revenue' column and add a backward-compatible alias.",
            "files": [
                {
                    "path": "models/marts/fct_sales.sql",
                    "language": "sql",
                    "content": "select\n  amount as revenue\nfrom {{ ref('sales_data') }}\n",
                    "is_new": False,
                }
            ],
            "validation_steps": [
                "Run `dbt run --select fct_sales`",
                "Verify the Sales Dashboard refreshes",
            ],
            "risk": "LOW",
        }
    ),
    "[DOCUMENTATION]": json.dumps(
        {
            "markdown": "## Summary\nThe Sales Dashboard stopped updating after a deployment renamed the `revenue` column.\n\n## Problem Statement\nThe Sales Dashboard stopped updating after yesterday's deployment.\n\n## Investigation Steps\n1. Retrieved schema for analytics.sales_data\n2. Retrieved lineage around the dashboard\n3. Compared recent schema changes against dashboard expectations\n\n## DataHub Evidence\n- Schema for analytics.sales_data shows `revenue` was renamed to `amount`.\n- Lineage: sales_data -> fct_sales -> sales_dashboard.\n\n## Root Cause\nColumn `revenue` renamed to `amount`; downstream still references `revenue`.\n\n## Proposed Fix\nUpdate fct_sales to select `amount as revenue`.\n\n## Validation Steps\n1. Run `dbt run --select fct_sales`\n2. Verify the Sales Dashboard refreshes\n\n## Recommendations\nAdd a schema-change test in CI to catch renames affecting downstream dashboards.\n",
            "summary": "The Sales Dashboard broke because `revenue` was renamed to `amount`; fix the dbt model to alias it back.",
            "sections": [
                "Summary",
                "Problem Statement",
                "Investigation Steps",
                "DataHub Evidence",
                "Root Cause",
                "Proposed Fix",
                "Validation Steps",
                "Recommendations",
            ],
        }
    ),
}


# --- Factory ---------------------------------------------------------------


def get_llm_client() -> LLMClient:
    """Select the LLM client based on settings.LLM_PROVIDER.

    Falls back gracefully:
      - "nim"     -> NIMClient (needs NVIDIA_API_KEY; else StubLLMClient)
      - "ollama"  -> OllamaClient (no key needed; but if unreachable at call
                    time, complete() returns an empty LLMResponse)
      - "stub"    -> StubLLMClient (deterministic, offline)
    """
    provider = settings.LLM_PROVIDER.lower()
    if provider == "stub":
        return StubLLMClient()
    if provider == "ollama":
        return OllamaClient()
    if provider == "nim":
        if not settings.NVIDIA_API_KEY:
            logger.warning("NVIDIA_API_KEY not set; using StubLLMClient so the pipeline still runs.")
            return StubLLMClient()
        return NIMClient()
    logger.warning("Unknown LLM_PROVIDER=%r; using StubLLMClient", provider)
    return StubLLMClient()
