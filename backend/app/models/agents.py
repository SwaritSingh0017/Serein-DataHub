"""Agent input/output contracts.

Pure domain layer. Mirrors docs/07_AGENT_SPEC.md.
Agents are stateless functions: AgentInput -> AgentOutput.
They never mutate the Investigation; the Investigation Manager does.
"""

from __future__ import annotations

from datetime import datetime
from pydantic import BaseModel, Field

from app.models.datahub import DataAsset, DomainRecord, GlossaryTerm, LineageEdge, LineageGraph, OwnershipRecord, SchemaRecord, TagRecord
from app.models.enums import AgentType, ContextType, FixType, RiskLevel, Severity, TaskStatus


# --- Shared task envelope -------------------------------------------------

class AgentTask(BaseModel):
    id: str
    investigation_id: str
    agent: AgentType
    status: TaskStatus = TaskStatus.PENDING
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None
    degraded: bool = False


class AgentResult(BaseModel):
    agent: AgentType
    success: bool
    duration_ms: int
    error: str | None = None


# --- Planner --------------------------------------------------------------

class PlannerInput(BaseModel):
    investigation_id: str
    user_problem: str
    created_at: datetime


class InvestigationPlan(BaseModel):
    summary: str
    severity: Severity = Severity.MEDIUM
    affected_assets: list[str] = Field(default_factory=list)
    required_context: list[ContextType] = Field(default_factory=list)
    hypotheses: list[str] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)


# --- Investigator --------------------------------------------------------

class InvestigatorInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan


class DataHubContext(BaseModel):
    assets: list[DataAsset] = Field(default_factory=list)
    lineage: list[LineageEdge] = Field(default_factory=list)
    ownership: list[OwnershipRecord] = Field(default_factory=list)
    tags: list[TagRecord] = Field(default_factory=list)
    domains: list[DomainRecord] = Field(default_factory=list)
    glossary: list[GlossaryTerm] = Field(default_factory=list)
    schemas: list[SchemaRecord] = Field(default_factory=list)
    raw: dict = Field(default_factory=dict)


# --- Root Cause ----------------------------------------------------------

class EvidenceItem(BaseModel):
    asset_urn: str
    fact: str
    source: str  # "DataHub lineage" | "DataHub schema" | "DataHub ownership"


class RootCauseInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan
    context: DataHubContext


class RootCauseAnalysis(BaseModel):
    root_cause: str
    confidence: float = 0.0
    evidence: list[EvidenceItem] = Field(default_factory=list)
    affected_assets: list[str] = Field(default_factory=list)
    rejected_hypotheses: list[str] = Field(default_factory=list)
    recommended_fix_type: FixType = FixType.NONE


# --- Fix Generator -------------------------------------------------------

class FixFile(BaseModel):
    path: str
    language: str  # sql | python | yaml | json | markdown
    content: str
    is_new: bool = True


class FixGeneratorInput(BaseModel):
    investigation_id: str
    root_cause: RootCauseAnalysis
    context: DataHubContext


class GeneratedFix(BaseModel):
    fix_type: FixType = FixType.NONE
    title: str
    description: str
    files: list[FixFile] = Field(default_factory=list)
    validation_steps: list[str] = Field(default_factory=list)
    risk: RiskLevel = RiskLevel.MEDIUM


# --- Documentation -------------------------------------------------------

class DocumentationInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan
    context: DataHubContext
    root_cause: RootCauseAnalysis
    fix: GeneratedFix


class GeneratedReport(BaseModel):
    markdown: str
    summary: str
    sections: list[str] = Field(default_factory=list)


# --- GitHub --------------------------------------------------------------

class GitHubAgentInput(BaseModel):
    investigation_id: str
    fix: GeneratedFix
    report: GeneratedReport
    base_branch: str = "main"


class PullRequestResult(BaseModel):
    repository: str = ""
    branch: str = ""
    pr_number: int = 0
    pr_url: str = ""
    commit_sha: str = ""
    files_changed: list[str] = Field(default_factory=list)


# Convenience re-export alias matching the spec name
LineageGraphRef = LineageGraph
