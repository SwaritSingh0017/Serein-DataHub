"""Investigation API models (request/response DTOs).

These are separate from domain models - they represent the API contract.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.models.enums import InvestigationStatus


class CreateInvestigationRequest(BaseModel):
    user_problem: str = Field(..., min_length=1, max_length=5000, description="Natural language description of the data problem")


class CreateInvestigationResponse(BaseModel):
    investigation_id: str
    status: InvestigationStatus
    message: str = "Investigation created and started"


class InvestigationSummaryResponse(BaseModel):
    investigation_id: str
    user_problem: str
    status: InvestigationStatus
    severity: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    degraded: bool = False


class InvestigationDetailResponse(BaseModel):
    investigation_id: str
    user_problem: str
    status: InvestigationStatus
    severity: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    degraded: bool = False
    plan: Optional[dict] = None
    context: Optional[dict] = None
    root_cause: Optional[dict] = None
    fix: Optional[dict] = None
    report: Optional[dict] = None
    pull_request: Optional[dict] = None
    timeline: list[dict] = []
    errors: list[str] = []


# Re-export domain enums for API docs
__all__ = [
    "CreateInvestigationRequest",
    "CreateInvestigationResponse",
    "InvestigationSummaryResponse",
    "InvestigationDetailResponse",
]