"""
LangGraph workflow for Investigation pipeline.

Implements the fixed pipeline from docs/08_LANGGRAPH_SPEC.md:
planner -> investigator -> root_cause -> fix_generator -> docs -> github (conditional)
"""

from __future__ import annotations

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END

from app.models.investigation import Investigation
from app.services.manager import InvestigationManager
from app.llm import get_llm_client
from app.services.datahub import get_datahub_provider
from app.services.github import get_github_provider


# --- State schema ----------------------------------------------------------


class InvestigationState(TypedDict):
    """TypedDict that flows through the LangGraph. Mirrors 08_LANGGRAPH_SPEC.md."""

    investigation_id: str
    user_problem: str
    created_at: str

    status: str
    severity: str | None
    degraded: bool

    plan: dict | None
    context: dict | None
    root_cause: dict | None
    fix: dict | None
    report: dict | None
    pull_request: dict | None

    timeline: list[dict]
    errors: list[str]


# --- Node functions --------------------------------------------------------


async def _investigation_to_state(inv: Investigation) -> InvestigationState:
    """Convert Investigation aggregate to LangGraph state dict."""
    return InvestigationState(
        investigation_id=inv.id,
        user_problem=inv.user_problem,
        created_at=inv.created_at.isoformat(),
        status=inv.status.value,
        severity=inv.severity.value if inv.severity else None,
        degraded=inv.degraded,
        plan=inv.plan.model_dump() if inv.plan else None,
        context=inv.context.model_dump() if inv.context else None,
        root_cause=inv.root_cause.model_dump() if inv.root_cause else None,
        fix=inv.fix.model_dump() if inv.fix else None,
        report=inv.report.model_dump() if inv.report else None,
        pull_request=inv.pull_request.model_dump() if inv.pull_request else None,
        timeline=[e.model_dump() for e in inv.timeline],
        errors=inv.errors,
    )


async def _state_to_investigation(state: InvestigationState) -> Investigation:
    """Convert LangGraph state dict back to Investigation aggregate."""
    # Import here to avoid circular
    from app.models.agents import (
        InvestigationPlan,
        DataHubContext,
        RootCauseAnalysis,
        GeneratedFix,
        GeneratedReport,
        PullRequestResult,
    )
    from app.models.investigation import TimelineEvent
    from app.models.enums import InvestigationStatus, Severity

    inv = Investigation(
        id=state["investigation_id"],
        user_problem=state["user_problem"],
        created_at=__import__("datetime").datetime.fromisoformat(state["created_at"]),
    )
    inv.status = InvestigationStatus(state["status"])
    if state["severity"]:
        inv.severity = Severity(state["severity"])
    inv.degraded = state.get("degraded", False)
    if state["plan"]:
        inv.plan = InvestigationPlan(**state["plan"])
    if state["context"]:
        inv.context = DataHubContext(**state["context"])
    if state["root_cause"]:
        inv.root_cause = RootCauseAnalysis(**state["root_cause"])
    if state["fix"]:
        inv.fix = GeneratedFix(**state["fix"])
    if state["report"]:
        inv.report = GeneratedReport(**state["report"])
    if state["pull_request"]:
        inv.pull_request = PullRequestResult(**state["pull_request"])
    inv.timeline = [TimelineEvent(**e) for e in state.get("timeline", [])]
    inv.errors = state.get("errors", [])
    return inv


async def planner_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_planner(inv)
    return await _investigation_to_state(inv)


async def investigator_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_investigator(inv)
    return await _investigation_to_state(inv)


async def root_cause_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_root_cause(inv)
    return await _investigation_to_state(inv)


async def fix_generator_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_fix_generator(inv)
    return await _investigation_to_state(inv)


async def docs_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_documentation(inv)
    return await _investigation_to_state(inv)


async def github_node(state: InvestigationState) -> InvestigationState:
    inv = await _state_to_investigation(state)
    manager = InvestigationManager(
        llm_client=get_llm_client(),
        datahub_provider=await get_datahub_provider(),
        github_provider=get_github_provider(),
    )
    await manager._run_github(inv)
    return await _investigation_to_state(inv)


# --- Conditional edge ------------------------------------------------------


def should_create_pr(state: InvestigationState) -> Literal["github", "skip_github"]:
    """Skip GitHub if no fix files were generated."""
    fix = state.get("fix") or {}
    if not fix.get("files"):
        return "skip_github"
    return "github"


# --- Graph construction ----------------------------------------------------


def build_investigation_graph():
    """Construct and compile the LangGraph investigation workflow."""
    workflow = StateGraph(InvestigationState)

    # Nodes
    workflow.add_node("planner", planner_node)
    workflow.add_node("investigator", investigator_node)
    workflow.add_node("root_cause", root_cause_node)
    workflow.add_node("fix_generator", fix_generator_node)
    workflow.add_node("docs", docs_node)
    workflow.add_node("github", github_node)
    workflow.add_node("skip_github", lambda s: s)  # no-op

    # Linear edges
    workflow.set_entry_point("planner")
    workflow.add_edge("planner", "investigator")
    workflow.add_edge("investigator", "root_cause")
    workflow.add_edge("root_cause", "fix_generator")
    workflow.add_edge("fix_generator", "docs")

    # Conditional edge after docs
    workflow.add_conditional_edges(
        "docs",
        should_create_pr,
        {
            "github": "github",
            "skip_github": "skip_github",
        },
    )

    # Both github and skip_github go to END
    workflow.add_edge("github", END)
    workflow.add_edge("skip_github", END)

    return workflow.compile()


# --- Convenience runner ----------------------------------------------------


async def run_investigation(investigation: Investigation) -> Investigation:
    """
    Run an investigation through the LangGraph pipeline.

    This is the main entry point used by the API layer.
    """
    graph = build_investigation_graph()
    initial_state = await _investigation_to_state(investigation)
    final_state = await graph.ainvoke(initial_state)
    return await _state_to_investigation(final_state)