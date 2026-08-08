"""Domain models and enums for Serein DataHub Agent.

The domain layer is pure (no framework code, no I/O). Everything here
mirrors the contracts in docs/03_BACKEND_SPEC.md, docs/07_AGENT_SPEC.md,
and docs/09_DATAHUB_SPEC.md.
"""

from app.models.agents import (
    AgentResult,
    AgentTask,
    DataHubContext,
    DocumentationInput,
    EvidenceItem,
    FixFile,
    FixGeneratorInput,
    GeneratedFix,
    GeneratedReport,
    GitHubAgentInput,
    InvestigatorInput,
    InvestigationPlan,
    PlannerInput,
    PullRequestResult,
    RootCauseAnalysis,
    RootCauseInput,
)
from app.models.datahub import (
    ColumnRecord,
    DataAsset,
    DomainRecord,
    GlossaryTerm,
    LineageEdge,
    LineageGraph,
    OwnershipRecord,
    SchemaRecord,
    TagRecord,
)
from app.models.enums import (
    AgentType,
    AssetType,
    ContextType,
    FixType,
    InvestigationStatus,
    OwnerType,
    RiskLevel,
    Severity,
    TaskStatus,
)
from app.models.investigation import Investigation, TimelineEvent

__all__ = [
    # enums
    "AgentType",
    "AssetType",
    "ContextType",
    "FixType",
    "InvestigationStatus",
    "OwnerType",
    "RiskLevel",
    "Severity",
    "TaskStatus",
    # investigation aggregate
    "Investigation",
    "TimelineEvent",
    # agent contracts
    "AgentResult",
    "AgentTask",
    "DataHubContext",
    "DocumentationInput",
    "EvidenceItem",
    "FixFile",
    "FixGeneratorInput",
    "GeneratedFix",
    "GeneratedReport",
    "GitHubAgentInput",
    "InvestigatorInput",
    "InvestigationPlan",
    "PlannerInput",
    "PullRequestResult",
    "RootCauseAnalysis",
    "RootCauseInput",
    # datahub records
    "ColumnRecord",
    "DataAsset",
    "DomainRecord",
    "GlossaryTerm",
    "LineageEdge",
    "LineageGraph",
    "OwnershipRecord",
    "SchemaRecord",
    "TagRecord",
]
