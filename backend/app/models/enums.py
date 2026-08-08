"""Domain enums for Serein DataHub Agent.

Pure domain layer. No framework code, no I/O.
See docs/03_BACKEND_SPEC.md and docs/07_AGENT_SPEC.md.
"""

from __future__ import annotations

from enum import Enum


class InvestigationStatus(str, Enum):
    """Lifecycle of an Investigation. See 03_BACKEND_SPEC.md state machine."""

    CREATED = "CREATED"
    PLANNING = "PLANNING"
    COLLECTING_CONTEXT = "COLLECTING_CONTEXT"
    INVESTIGATING = "INVESTIGATING"
    ANALYZING = "ANALYZING"
    GENERATING_FIX = "GENERATING_FIX"
    GENERATING_REPORT = "GENERATING_REPORT"
    CREATING_PR = "CREATING_PR"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AgentType(str, Enum):
    PLANNER = "PLANNER"
    INVESTIGATOR = "INVESTIGATOR"
    ROOT_CAUSE = "ROOT_CAUSE"
    FIX = "FIX"
    DOCS = "DOCS"
    GITHUB = "GITHUB"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ContextType(str, Enum):
    """What kinds of DataHub context an investigation needs."""

    SCHEMA = "SCHEMA"
    LINEAGE = "LINEAGE"
    OWNERSHIP = "OWNERSHIP"
    TAGS = "TAGS"
    DOMAINS = "DOMAINS"
    GLOSSARY = "GLOSSARY"
    DEPLOYMENTS = "DEPLOYMENTS"


class FixType(str, Enum):
    SQL = "SQL"
    DBT = "DBT"
    PYTHON = "PYTHON"
    YAML = "YAML"
    CONFIG = "CONFIG"
    NONE = "NONE"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AssetType(str, Enum):
    DATASET = "dataset"
    DASHBOARD = "dashboard"
    PIPELINE = "pipeline"
    ML_MODEL = "ml_model"


class OwnerType(str, Enum):
    USER = "user"
    GROUP = "group"
    TEAM = "team"
