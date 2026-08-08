"""The Investigation aggregate root and its timeline.

Pure-ish domain: Investigation holds the state that the Investigation
Manager mutates. It serializes to/from dicts so it can flow through the
LangGraph state (see 08_LANGGRAPH_SPEC.md) and be checkpointed.
"""

from __future__ import annotations

from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.models.agents import (
    DataHubContext,
    GeneratedFix,
    GeneratedReport,
    InvestigationPlan,
    PullRequestResult,
    RootCauseAnalysis,
)
from app.models.enums import InvestigationStatus, Severity


class TimelineEvent(BaseModel):
    """One immutable event in an Investigation's timeline."""

    id: str
    investigation_id: str
    timestamp: datetime
    agent: str              # AgentType value or "SYSTEM"
    event: str              # human-readable description
    status: str             # TaskStatus value or "INFO"
    metadata: dict = Field(default_factory=dict)


class Investigation(BaseModel):
    """The central object. Everything exists to complete an Investigation."""

    id: str
    user_problem: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    status: InvestigationStatus = InvestigationStatus.CREATED
    severity: Severity | None = None
    degraded: bool = False

    # Agent outputs (None until the corresponding node runs)
    plan: InvestigationPlan | None = None
    context: DataHubContext | None = None
    root_cause: RootCauseAnalysis | None = None
    fix: GeneratedFix | None = None
    report: GeneratedReport | None = None
    pull_request: PullRequestResult | None = None

    timeline: list[TimelineEvent] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

    def touch(self) -> None:
        self.updated_at = datetime.now(timezone.utc)

    def add_event(self, event: TimelineEvent) -> None:
        self.timeline.append(event)
        self.touch()

    def add_error(self, error: str) -> None:
        self.errors.append(error)
        self.touch()

    def mark_degraded(self) -> None:
        self.degraded = True
        self.touch()
