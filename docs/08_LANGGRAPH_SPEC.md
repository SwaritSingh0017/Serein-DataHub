# SEREIN DATAHUB AGENT
# 08_LANGGRAPH_SPEC.md

Version 1.0

---

# PURPOSE

This document defines:

1. The LangGraph state schema for an Investigation.
2. The graph nodes and edges that orchestrate the agents.
3. The shared LLM interface that all LLM-based agents use.

This document is the single source of truth for the orchestration graph and the LLM abstraction.

---

# WHY LANGGRAPH

LangGraph gives us:

- A typed state object that flows through the graph.
- Explicit nodes (one per agent) and edges (transitions).
- Conditional routing (e.g. skip GitHub on fix failure).
- Built-in checkpointing for future resumability.
- A clear visualization of the investigation pipeline.

We do NOT use LangGraph for free-form agent chatter.
The graph is a fixed, deterministic pipeline.

---

# INVESTIGATION STATE SCHEMA

The state is a single Pydantic model that flows through every node.

```python
from typing import TypedDict

class InvestigationState(TypedDict):
    # Identity
    investigation_id: str
    user_problem: str
    created_at: str                    # ISO 8601

    # Status
    status: str                        # InvestigationStatus enum value
    severity: str | None               # set by Planner
    degraded: bool                      # True if any agent used a fallback path

    # Agent outputs (None until the corresponding node runs)
    plan: dict | None                  # InvestigationPlan serialized
    context: dict | None               # DataHubContext serialized
    root_cause: dict | None            # RootCauseAnalysis serialized
    fix: dict | None                   # GeneratedFix serialized
    report: dict | None                # GeneratedReport serialized
    pull_request: dict | None          # PullRequestResult serialized

    # Timeline
    timeline: list[dict]               # list of TimelineEvent serialized

    # Error tracking
    errors: list[str]
```

Notes:

- All agent outputs are stored as dicts (JSON-serializable) so the state can be checkpointed.
- Each node reads what it needs and writes only its own output plus `status`, `timeline`, `errors`, `degraded`.
- The Investigation Manager is the boundary that converts between the persisted `Investigation` domain object and the `InvestigationState` dict.

---

# GRAPH NODES

Each node is a function with the signature:

```python
async def node_name(state: InvestigationState) -> InvestigationState:
    ...
```

| Node              | Agent            | Reads                         | Writes                          |
|-------------------|------------------|-------------------------------|---------------------------------|
| planner_node      | Planner          | user_problem                  | plan, severity, timeline        |
| investigator_node | Investigator     | plan                          | context, timeline               |
| root_cause_node   | RootCause        | plan, context                 | root_cause, timeline            |
| fix_node          | FixGenerator     | root_cause, context           | fix, timeline                   |
| docs_node         | Documentation    | plan, context, root_cause, fix | report, timeline                |
| github_node       | GitHub           | fix, report                   | pull_request, timeline          |

Every node:

1. Appends a TimelineEvent at start (status RUNNING).
2. Calls the corresponding agent.
3. Appends a TimelineEvent at completion (status COMPLETED or FAILED).
4. Updates `status` to the next state in the state machine.
5. On a caught failure, sets `degraded=True`, appends the error, and continues (per 07_AGENT_SPEC.md failure modes).

---

# GRAPH EDGES

The graph is linear with one conditional branch.

```
START
  |
  v
planner_node
  |
  v
investigator_node
  |
  v
root_cause_node
  |
  v
fix_node
  |
  v
docs_node
  |
  v
github_node
  |
  v
END
```

## Conditional Edge: skip_github

After `docs_node`, if `fix.files` is empty (fix generation failed), the graph skips `github_node` and goes directly to END with status COMPLETED (degraded). There is no point opening a PR with no file changes.

Implementation:

```python
def should_create_pr(state: InvestigationState) -> str:
    fix = state.get("fix") or {}
    if not fix.get("files"):
        return "skip_github"
    return "github"
```

## No Other Branching

The pipeline does not loop, does not re-plan, and does not re-investigate in the MVP. A failed investigation is a FAILED state, not a retry loop. Retries happen inside individual agents (see 07_AGENT_SPEC.md), not at the graph level.

---

# STATE MACHINE MAPPING

The Investigation status (domain enum) maps to graph progress as defined in 07_AGENT_SPEC.md. The graph node is responsible for advancing the status.

```
CREATED           (before planner_node)
PLANNING          (planner_node running)
COLLECTING_CONTEXT (investigator_node running)
INVESTIGATING     (investigator_node done, root_cause_node running)
ANALYZING         (root_cause_node running)  [alias of INVESTIGATING in some specs]
GENERATING_FIX    (fix_node running)
GENERATING_REPORT (docs_node running)
CREATING_PR       (github_node running)
COMPLETED         (all nodes done)
FAILED            (unrecoverable error)
ARCHIVED          (user-archived, post-completion)
```

---

# LLM INTERFACE

All LLM-based agents depend on a single interface, not on a specific provider.

```python
from typing import Protocol

class LLMClient(Protocol):
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        response_format: type | None,   # Pydantic model for structured output, or None for free text
    ) -> LLMResponse: ...
```

```python
class LLMResponse(BaseModel):
    text: str                           # raw model output
    parsed: BaseModel | None            # structured output if response_format was provided and parsing succeeded
    usage: TokenUsage | None
    latency_ms: int
    provider: str
    model: str
```

```python
class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
```

## Providers

Two implementations of `LLMClient`:

### NIMClient (default)

- Endpoint: `https://integrate.api.nvidia.com/v1` (OpenAI-compatible).
- Auth: `NVIDIA_API_KEY` env var.
- Uses the `openai` Python SDK pointed at the NIM base URL.
- Supports `response_format` via JSON mode + Pydantic validation.
- Default model: `qwen2.5-coder`.

### OllamaClient (fallback)

- Endpoint: `http://localhost:11434` (or `OLLAMA_BASE_URL`).
- No auth.
- Uses the `openai` SDK pointed at the Ollama OpenAI-compatible endpoint.
- Default model: `qwen2.5-coder`.

## Selection

```python
def get_llm_client() -> LLMClient:
    provider = settings.LLM_PROVIDER  # "nim" | "ollama"
    if provider == "ollama":
        return OllamaClient(model=settings.LLM_MODEL)
    return NIMClient(model=settings.LLM_MODEL, api_key=settings.NVIDIA_API_KEY)
```

The client is injected into agents via the Investigation Manager (dependency injection). Agents never construct the client themselves.

## Structured Output Strategy

For agents that require structured output (Planner, RootCause, FixGenerator, Documentation):

1. Request JSON via the provider's JSON mode.
2. Parse with the target Pydantic model.
3. On parse failure, retry once with a repair prompt that includes the parse error.
4. On second failure, fall back to the agent's documented degraded path.

---

# PROMPT MANAGEMENT

All prompts live under `backend/app/prompts/` as Python modules.

```
app/prompts/
    __init__.py
    planner.py          # PLANNER_PROMPT_V1
    root_cause.py       # ROOT_CAUSE_PROMPT_V1
    fix_generator.py    # FIX_GENERATOR_PROMPT_V1
    documentation.py    # DOCUMENTATION_PROMPT_V1
```

Each prompt module exposes:

```python
PLANNER_PROMPT_V1 = """..."""
PLANNER_REPAIR_PROMPT_V1 = """..."""
```

Prompts are versioned (V1, V2, ...) and never edited in place. A new version is a new constant. The agent selects the active version via a constant in the same module.

---

# CHECKPOINTING (FUTURE)

In the MVP, state lives in memory inside the Investigation Manager. The graph is constructed and run synchronously per investigation.

The architecture must not preclude LangGraph checkpointing (e.g. `MemorySaver` or a SQLite checkpointer) so that an interrupted investigation can resume from the last completed node. This is a Phase 2 concern and is NOT required for the hackathon demo.

---

# TESTING RULES

- The graph must be testable with stub agents (no real LLM, no real DataHub, no real GitHub).
- Each node is unit-testable in isolation by passing a constructed `InvestigationState` and asserting on the returned state.
- The LLM interface is mocked in tests via a `StubLLMClient` that returns canned `LLMResponse` objects.
- Graph tests live under `tests/graph/`.

