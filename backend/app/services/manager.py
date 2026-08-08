"""InvestigationManager — the single state owner and agent orchestrator.

The Investigation Manager:
- Holds the Investigation aggregate
- Calls agents in the fixed order (Planner → Investigator → RootCause → FixGenerator → Documentation → GitHub)
- Appends TimelineEvents for every agent start/end
- Updates Investigation status per the state machine
- Never lets an exception escape; every failure is captured as a degraded path
- Is fully testable with stub LLM, fixture DataHub, stub GitHub

See docs/07_AGENT_SPEC.md (orchestration rules) and docs/08_LANGGRAPH_SPEC.md (state machine).
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from app.llm import LLMClient
    from app.services.datahub import DataHubProvider
    from app.services.github import GitHubProvider
    from app.models.investigation import Investigation, TimelineEvent
    from app.models.agents import (
        AgentResult,
        AgentType,
        DataHubContext,
        DocumentationInput,
        FixGeneratorInput,
        GeneratedFix,
        GeneratedReport,
        InvestigatorInput,
        InvestigationPlan,
        PlannerInput,
        PullRequestResult,
        RootCauseAnalysis,
        RootCauseInput,
        TaskStatus,
    )

logger = logging.getLogger("serein_datahub.manager")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_event(investigation_id: str, agent: str, event: str, status: str, metadata: dict | None = None) -> "TimelineEvent":
    from app.models.investigation import TimelineEvent
    return TimelineEvent(
        id=str(uuid.uuid4())[:8],
        investigation_id=investigation_id,
        timestamp=_now(),
        agent=agent,
        event=event,
        status=status,
        metadata=metadata or {},
    )


class InvestigationManager:
    """Orchestrates one investigation end-to-end."""

    def __init__(
        self,
        *,
        llm_client: "LLMClient",
        datahub_provider: "DataHubProvider",
        github_provider: "GitHubProvider",
    ) -> None:
        self._llm = llm_client
        self._datahub = datahub_provider
        self._github = github_provider

    # ------------------------------------------------------------------ #
    # Public entry point
    # ------------------------------------------------------------------ #

    async def run(self, investigation: "Investigation") -> "Investigation":
        """Execute the full investigation pipeline on the given Investigation."""
        # Each step mutates the investigation in place and appends timeline events.
        # Any step that logs an error but doesn't raise uses investigation.mark_degraded().

        logger.info("Starting investigation %s", investigation.id)

        try:
            await self._run_planner(investigation)
            await self._run_investigator(investigation)
            await self._run_root_cause(investigation)
            await self._run_fix_generator(investigation)
            await self._run_documentation(investigation)
            await self._run_github(investigation)
        except Exception as exc:  # noqa: BLE001 - absolute safety net
            logger.exception("Unhandled error in investigation %s", investigation.id)
            investigation.add_error(f"Unhandled manager error: {exc}")
            investigation.status = investigation.status.FAILED  # type: ignore[attr-defined]
            investigation.mark_degraded()
        else:
            if investigation.status != investigation.status.FAILED:
                investigation.status = investigation.status.COMPLETED
                investigation.add_event(
                    _make_event(
                        investigation.id,
                        "SYSTEM",
                        "Investigation completed",
                        "COMPLETED",
                        {"degraded": investigation.degraded},
                    )
                )

        investigation.touch()
        return investigation

    # ------------------------------------------------------------------ #
    # Planner
    # ------------------------------------------------------------------ #

    async def _run_planner(self, investigation: "Investigation") -> None:
        from app.models.agents import PlannerInput, InvestigationPlan
        from app.prompts.planner import PLANNER_PROMPT_V1, PLANNER_REPAIR_PROMPT_V1
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.PLANNING
        investigation.add_event(_make_event(investigation.id, AgentType.PLANNER.value, "Planner started", "RUNNING"))

        inp = PlannerInput(
            investigation_id=investigation.id,
            user_problem=investigation.user_problem,
            created_at=investigation.created_at,
        )
        sys_prompt = f"{PLANNER_PROMPT_V1}\n[PLANNER]"

        resp = await self._llm.complete(system_prompt=sys_prompt, user_prompt=inp.user_problem, response_format=InvestigationPlan)
        if resp.parsed is None:
            # one retry with repair prompt
            logger.warning("Planner parse failed; retrying")
            resp = await self._llm.complete(system_prompt=f"{PLANNER_REPAIR_PROMPT_V1}\n[PLANNER]", user_prompt=resp.text or "", response_format=InvestigationPlan)

        if resp.parsed is None:
            investigation.mark_degraded()
            plan = InvestigationPlan(
                summary=inp.user_problem[:120],
                severity="MEDIUM",
                required_context=["SCHEMA", "LINEAGE", "OWNERSHIP"],
            )
            investigation.add_error("Planner: LLM unavailable or parse failed; using default plan")
        else:
            plan = resp.parsed

        investigation.plan = plan
        investigation.severity = plan.severity
        investigation.status = IS.COLLECTING_CONTEXT
        investigation.add_event(_make_event(investigation.id, AgentType.PLANNER.value, "Planner completed", "COMPLETED", {"severity": plan.severity.value}))

    # ------------------------------------------------------------------ #
    # Investigator (no LLM)
    # ------------------------------------------------------------------ #

    async def _run_investigator(self, investigation: "Investigation") -> None:
        from app.models.agents import InvestigatorInput, DataHubContext, ContextType, LineageGraph
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.INVESTIGATING
        investigation.add_event(_make_event(investigation.id, AgentType.INVESTIGATOR.value, "Investigator started", "RUNNING"))

        plan = investigation.plan or InvestigationPlan(summary="", required_context=[ContextType.SCHEMA])
        inp = InvestigatorInput(investigation_id=investigation.id, plan=plan)

        assets: list = []
        lineage: list = []
        ownership: list = []
        tags: list = []
        domains: list = []
        glossary: list = []
        schemas: list = []
        raw: dict = {}

        # First, search for assets if planner didn't provide URNs
        asset_urns = list(plan.affected_assets)
        if not asset_urns and investigation.user_problem:
            try:
                search_results = await self._datahub.search_assets(investigation.user_problem, limit=20)
                asset_urns = [asset.urn for asset in search_results]
                logger.info("Investigator searched for assets, found %d: %s", len(asset_urns), asset_urns)
            except Exception as exc:
                logger.warning("Investigator search failed: %s", exc)

        # For each asset URN, fetch schema + lineage + ownership + tags + domain + glossary
        for urn in asset_urns:
            try:
                asset = await self._datahub.get_asset(urn)
                assets.append(asset)
                schema = await self._datahub.get_schema(urn)
                if schema:
                    schemas.append(schema)
                raw[urn] = {"asset": asset, "schema": schema}
            except Exception as exc:
                logger.warning("Investigator asset %s failed: %s", urn, exc)

            try:
                lg = await self._datahub.get_lineage(urn, direction="both", depth=1)
                lineage.extend(lg.upstream)
                lineage.extend(lg.downstream)
                raw.setdefault(urn, {})["lineage"] = lg
            except Exception as exc:
                logger.warning("Investigator lineage %s failed: %s", urn, exc)

            try:
                owns = await self._datahub.get_ownership(urn)
                ownership.extend(owns)
                raw.setdefault(urn, {})["ownership"] = owns
            except Exception as exc:
                logger.warning("Investigator ownership %s failed: %s", urn, exc)

            # Tags, domains, glossary (best-effort)
            try:
                tags.extend(await self._datahub.get_tags(urn))
            except Exception:
                pass
            try:
                dom = await self._datahub.get_domain(urn)
                if dom:
                    domains.append(dom)
            except Exception:
                pass
            try:
                glossary.extend(await self._datahub.get_glossary_terms(urn))
            except Exception:
                pass

        ctx = DataHubContext(
            assets=assets,
            lineage=lineage,
            ownership=ownership,
            tags=tags,
            domains=domains,
            glossary=glossary,
            schemas=schemas,
            raw=raw,
        )
        investigation.context = ctx
        investigation.status = IS.ANALYZING
        investigation.add_event(_make_event(investigation.id, AgentType.INVESTIGATOR.value, "Investigator completed", "COMPLETED", {"assets": len(assets), "lineage_edges": len(lineage)}))

    # ------------------------------------------------------------------ #
    # Root Cause
    # ------------------------------------------------------------------ #

    async def _run_root_cause(self, investigation: "Investigation") -> None:
        from app.models.agents import RootCauseInput, RootCauseAnalysis
        from app.prompts.root_cause import ROOT_CAUSE_PROMPT_V1, ROOT_CAUSE_REPAIR_PROMPT_V1
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.ANALYZING
        investigation.add_event(_make_event(investigation.id, AgentType.ROOT_CAUSE.value, "RootCause started", "RUNNING"))

        inp = RootCauseInput(
            investigation_id=investigation.id,
            plan=investigation.plan,
            context=investigation.context,
        )

        # Build a compact JSON-ish prompt for the LLM
        user_prompt = self._format_root_cause_prompt(inp)

        resp = await self._llm.complete(system_prompt=f"{ROOT_CAUSE_PROMPT_V1}\n[ROOT_CAUSE]", user_prompt=user_prompt, response_format=RootCauseAnalysis)
        if resp.parsed is None:
            logger.warning("RootCause parse failed; retrying")
            resp = await self._llm.complete(system_prompt=f"{ROOT_CAUSE_REPAIR_PROMPT_V1}\n[ROOT_CAUSE]", user_prompt=resp.text or "", response_format=RootCauseAnalysis)

        if resp.parsed is None:
            investigation.mark_degraded()
            rc = RootCauseAnalysis(
                root_cause="Unable to determine root cause: LLM unavailable",
                confidence=0.0,
            )
            investigation.add_error("RootCause: LLM unavailable or parse failed")
        else:
            rc = resp.parsed

        investigation.root_cause = rc
        investigation.status = IS.GENERATING_FIX
        investigation.add_event(_make_event(investigation.id, AgentType.ROOT_CAUSE.value, "RootCause completed", "COMPLETED", {"confidence": rc.confidence}))

    def _format_root_cause_prompt(self, inp: "RootCauseInput") -> str:
        import json
        # Build comprehensive evidence from DataHub context
        evidence_parts = [
            f"Plan: {inp.plan.summary if inp.plan else 'N/A'}",
            f"Hypotheses: {inp.plan.hypotheses if inp.plan else []}",
            f"Context assets: {len(inp.context.assets)}",
            f"Lineage edges: {len(inp.context.lineage)}",
            f"Ownership records: {len(inp.context.ownership)}",
            f"Schemas: {len(inp.context.schemas)}",
        ]
        
        # Add detailed schema information
        if inp.context.schemas:
            schema_details = []
            for schema in inp.context.schemas:
                cols = [f"  - {c.name}: {c.type} ({'nullable' if c.nullable else 'not null'})" for c in schema.columns]
                schema_details.append(f"Schema for {schema.urn}:\n" + "\n".join(cols))
            evidence_parts.append("DETAILED SCHEMAS:\n" + "\n\n".join(schema_details))
        
        # Add lineage information
        if inp.context.lineage:
            lineage_details = []
            for edge in inp.context.lineage[:20]:  # Limit to first 20
                lineage_details.append(f"  {edge.source_urn} --({edge.relationship})--> {edge.target_urn}")
            evidence_parts.append("LINEAGE (first 20):\n" + "\n".join(lineage_details))
        
        # Add ownership
        if inp.context.ownership:
            ownership_details = []
            for own in inp.context.ownership[:10]:
                ownership_details.append(f"  {own.asset_urn} owned by {own.owner_name} ({own.owner_type})")
            evidence_parts.append("OWNERSHIP (first 10):\n" + "\n".join(ownership_details))
        
        # Add tags
        if inp.context.tags:
            tags_by_asset = {}
            for tag in inp.context.tags[:20]:
                tags_by_asset.setdefault(tag.asset_urn, []).append(tag.tag_name)
            tag_details = [f"  {urn}: {', '.join(tags)}" for urn, tags in tags_by_asset.items()]
            evidence_parts.append("TAGS:\n" + "\n".join(tag_details))
        
        # Add domains
        if inp.context.domains:
            domain_details = []
            for dom in inp.context.domains[:10]:
                domain_details.append(f"  {dom.urn}: {dom.name}")
            evidence_parts.append("DOMAINS:\n" + "\n".join(domain_details))
        
        # Add glossary
        if inp.context.glossary:
            glossary_details = []
            for gloss in inp.context.glossary[:10]:
                glossary_details.append(f"  {gloss.urn}: {gloss.name} - {gloss.description}")
            evidence_parts.append("GLOSSARY (first 10):\n" + "\n".join(glossary_details))
        
        return "\n\n".join(evidence_parts)

    # ------------------------------------------------------------------ #
    # Fix Generator
    # ------------------------------------------------------------------ #

    async def _run_fix_generator(self, investigation: "Investigation") -> None:
        from app.models.agents import FixGeneratorInput, GeneratedFix
        from app.prompts.fix_generator import FIX_GENERATOR_PROMPT_V1, FIX_GENERATOR_REPAIR_PROMPT_V1
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.GENERATING_FIX
        investigation.add_event(_make_event(investigation.id, AgentType.FIX.value, "FixGenerator started", "RUNNING"))

        inp = FixGeneratorInput(
            investigation_id=investigation.id,
            root_cause=investigation.root_cause,
            context=investigation.context,
        )

        user_prompt = self._format_fix_prompt(inp)

        resp = await self._llm.complete(system_prompt=f"{FIX_GENERATOR_PROMPT_V1}\n[FIX_GENERATOR]", user_prompt=user_prompt, response_format=GeneratedFix)
        if resp.parsed is None:
            logger.warning("FixGenerator parse failed; retrying")
            resp = await self._llm.complete(system_prompt=f"{FIX_GENERATOR_REPAIR_PROMPT_V1}\n[FIX_GENERATOR]", user_prompt=resp.text or "", response_format=GeneratedFix)

        if resp.parsed is None:
            investigation.mark_degraded()
            fix = GeneratedFix(
                fix_type="NONE",
                title="Fix generation failed",
                description="LLM unavailable or response unparsable",
                files=[],
                validation_steps=[],
                risk="HIGH",
            )
            investigation.add_error("FixGenerator: LLM unavailable or parse failed")
        else:
            fix = resp.parsed

        investigation.fix = fix
        investigation.status = IS.GENERATING_REPORT
        investigation.add_event(_make_event(investigation.id, AgentType.FIX.value, "FixGenerator completed", "COMPLETED", {"files": len(fix.files), "risk": fix.risk.value}))

    def _format_fix_prompt(self, inp: "FixGeneratorInput") -> str:
        import json
        rc = inp.root_cause
        parts = [
            f"Root cause: {rc.root_cause}",
            f"Confidence: {rc.confidence:.2f}",
            f"Fix type: {rc.recommended_fix_type.value}",
            f"Affected assets: {rc.affected_assets}",
            f"Evidence:\n" + "\n".join([f"  - {e.asset_urn}: {e.fact} (source: {e.source})" for e in rc.evidence]),
        ]
        if inp.context.schemas:
            parts.append("Schemas:\n" + json.dumps([s.model_dump() for s in inp.context.schemas], default=str)[:3000])
        if rc.evidence:
            parts.append("Detailed Evidence:\n" + "\n".join([f"  - {e.asset_urn}: {e.fact} (source: {e.source})" for e in rc.evidence]))
        if inp.context.lineage:
            lineage_summary = "\n".join([f"  {e.source_urn} --({e.relationship})--> {e.target_urn}" for e in inp.context.lineage[:15]])
            parts.append("Lineage:\n" + lineage_summary)
        return "\n\n".join(parts)

    # ------------------------------------------------------------------ #
    # Documentation
    # ------------------------------------------------------------------ #

    async def _run_documentation(self, investigation: "Investigation") -> None:
        from app.models.agents import DocumentationInput, GeneratedReport
        from app.prompts.documentation import DOCUMENTATION_PROMPT_V1, DOCUMENTATION_REPAIR_PROMPT_V1
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.GENERATING_REPORT
        investigation.add_event(_make_event(investigation.id, AgentType.DOCS.value, "Documentation started", "RUNNING"))

        inp = DocumentationInput(
            investigation_id=investigation.id,
            plan=investigation.plan,
            context=investigation.context,
            root_cause=investigation.root_cause,
            fix=investigation.fix,
        )

        user_prompt = self._format_docs_prompt(inp)

        resp = await self._llm.complete(system_prompt=f"{DOCUMENTATION_PROMPT_V1}\n[DOCUMENTATION]", user_prompt=user_prompt, response_format=GeneratedReport)
        if resp.parsed is None:
            logger.warning("Documentation parse failed; retrying")
            resp = await self._llm.complete(system_prompt=f"{DOCUMENTATION_REPAIR_PROMPT_V1}\n[DOCUMENTATION]", user_prompt=resp.text or "", response_format=GeneratedReport)

        if resp.parsed is None:
            investigation.mark_degraded()
            # Build a minimal report from structured data so the investigation still has documentation
            report = self._build_minimal_report(inp)
            investigation.add_error("Documentation: LLM unavailable; used minimal report")
        else:
            report = resp.parsed

        investigation.report = report
        investigation.status = IS.CREATING_PR
        investigation.add_event(_make_event(investigation.id, AgentType.DOCS.value, "Documentation completed", "COMPLETED", {"sections": len(report.sections)}))

    def _format_docs_prompt(self, inp: "DocumentationInput") -> str:
        import json
        parts = [
            f"Problem: {inp.plan.summary if inp.plan else 'N/A'}",
            f"Root cause: {inp.root_cause.root_cause if inp.root_cause else 'N/A'}",
            f"Fix: {inp.fix.title if inp.fix else 'N/A'} ({len(inp.fix.files)} files)" if inp.fix else "Fix: none",
        ]
        return "\n".join(parts)

    def _build_minimal_report(self, inp: "DocumentationInput") -> "GeneratedReport":
        from app.models.agents import GeneratedReport
        sections = [
            "Summary",
            "Problem Statement",
            "Investigation Steps",
            "DataHub Evidence",
            "Root Cause",
            "Proposed Fix",
            "Validation Steps",
            "Recommendations",
        ]
        md_lines = [
            "## Summary",
            inp.plan.summary if inp.plan else "No summary",
            "",
            "## Problem Statement",
            inp.plan.summary if inp.plan else "No problem statement",
            "",
            "## Investigation Steps",
            *(inp.plan.steps if inp.plan else []),
            "",
            "## DataHub Evidence",
            f"- Assets: {len(inp.context.assets)}",
            f"- Lineage edges: {len(inp.context.lineage)}",
            "",
            "## Root Cause",
            inp.root_cause.root_cause if inp.root_cause else "Unknown",
            "",
            "## Proposed Fix",
            inp.fix.description if inp.fix else "No fix generated",
            "",
            "## Validation Steps",
            *(inp.fix.validation_steps if inp.fix else []),
            "",
            "## Recommendations",
            "Review the generated fix and validate before merging.",
        ]
        return GeneratedReport(
            markdown="\n".join(md_lines),
            summary=inp.plan.summary if inp.plan else "No summary",
            sections=sections,
        )

    # ------------------------------------------------------------------ #
    # GitHub (no LLM)
    # ------------------------------------------------------------------ #

    async def _run_github(self, investigation: "Investigation") -> None:
        from app.models.agents import GitHubAgentInput, PullRequestResult
        from app.models.enums import InvestigationStatus as IS, AgentType

        investigation.status = IS.CREATING_PR
        investigation.add_event(_make_event(investigation.id, AgentType.GITHUB.value, "GitHub started", "RUNNING"))

        # Skip if no files to commit
        if not investigation.fix or not investigation.fix.files:
            investigation.add_event(_make_event(investigation.id, AgentType.GITHUB.value, "GitHub skipped (no files)", "COMPLETED"))
            investigation.pull_request = PullRequestResult()
            return

        inp = GitHubAgentInput(
            investigation_id=investigation.id,
            fix=investigation.fix,
            report=investigation.report,
            base_branch="main",
        )

        try:
            branch = f"investigation/{investigation.id}"
            await self._github.create_branch(settings.GITHUB_REPOSITORY or "owner/repo", inp.base_branch, branch)

            for f in inp.fix.files:
                await self._github.create_or_update_file(
                    settings.GITHUB_REPOSITORY or "owner/repo", branch, f.path, f.content, inp.fix.title, f.is_new
                )

            # Commit the report
            await self._github.create_or_update_file(
                settings.GITHUB_REPOSITORY or "owner/repo", branch, "INVESTIGATION_REPORT.md", 
                inp.report.markdown if inp.report else "No report", inp.fix.title, True
            )

            pr = await self._github.create_pull_request(
                settings.GITHUB_REPOSITORY or "owner/repo", branch, inp.base_branch, inp.fix.title, inp.report.markdown if inp.report else ""
            )
            investigation.pull_request = pr
            investigation.add_event(_make_event(investigation.id, AgentType.GITHUB.value, "GitHub completed", "COMPLETED", {"pr": pr.pr_url}))
        except Exception as exc:  # noqa: BLE001
            logger.warning("GitHub agent failed: %s", exc)
            investigation.add_error(f"GitHub: {exc}")
            investigation.mark_degraded()
            investigation.pull_request = PullRequestResult()