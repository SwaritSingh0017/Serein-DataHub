"""Investigations REST API router.

Endpoints:
- POST /investigations - Create and run an investigation
- GET /investigations - List investigations
- GET /investigations/{id} - Get investigation detail
- GET /investigations/{id}/timeline - Get timeline events
- GET /investigations/{id}/fix - Get generated fix
- GET /investigations/{id}/report - Get generated report
"""

from __future__ import annotations
from app.models.enums import InvestigationStatus

import uuid
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse

from app.api.schemas import (
    CreateInvestigationRequest,
    CreateInvestigationResponse,
    InvestigationSummaryResponse,
    InvestigationDetailResponse,
)
from app.models.investigation import Investigation
from app.services import get_investigation_store
from app.graph import run_investigation

router = APIRouter(prefix="/investigations", tags=["Investigations"])
_store = get_investigation_store()


@router.post("/", response_model=CreateInvestigationResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_investigation(request: CreateInvestigationRequest) -> CreateInvestigationResponse:
    """Create an investigation and run it asynchronously."""
    investigation_id = f"inv-{uuid.uuid4().hex[:8]}"
    investigation = Investigation(id=investigation_id, user_problem=request.user_problem)

    _store.create(investigation)

    # Run in background - in production would use background task or queue
    # For MVP, run synchronously but return 202
    import asyncio
    asyncio.create_task(_run_investigation_background(investigation_id))

    return CreateInvestigationResponse(investigation_id=investigation_id, status=InvestigationStatus.CREATED)


async def _run_investigation_background(investigation_id: str) -> None:
    """Background task to run investigation through LangGraph."""
    investigation = _store.get(investigation_id)
    if not investigation:
        return
    try:
        completed = await run_investigation(investigation)
        _store.update(completed)
    except Exception as exc:  # noqa: BLE001
        investigation.add_error(f"Background execution failed: {exc}")
        investigation.status = investigation.status.FAILED
        investigation.mark_degraded()
        _store.update(investigation)


@router.get("/", response_model=list[InvestigationSummaryResponse])
async def list_investigations(limit: int = 50, offset: int = 0) -> list[InvestigationSummaryResponse]:
    """List investigations, most recent first."""
    investigations = _store.list(limit=limit, offset=offset)
    return [
        InvestigationSummaryResponse(
            investigation_id=inv.id,
            user_problem=inv.user_problem,
            status=inv.status,
            severity=inv.severity.value if inv.severity else None,
            created_at=inv.created_at,
            updated_at=inv.updated_at,
            degraded=inv.degraded,
        )
        for inv in investigations
    ]


@router.get("/{investigation_id}", response_model=InvestigationDetailResponse)
async def get_investigation(investigation_id: str) -> InvestigationDetailResponse:
    """Get full investigation detail with all agent outputs."""
    investigation = _store.get(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return InvestigationDetailResponse(
        investigation_id=investigation.id,
        user_problem=investigation.user_problem,
        status=investigation.status,
        severity=investigation.severity.value if investigation.severity else None,
        created_at=investigation.created_at,
        updated_at=investigation.updated_at,
        degraded=investigation.degraded,
        plan=investigation.plan.model_dump() if investigation.plan else None,
        context=investigation.context.model_dump() if investigation.context else None,
        root_cause=investigation.root_cause.model_dump() if investigation.root_cause else None,
        fix=investigation.fix.model_dump() if investigation.fix else None,
        report=investigation.report.model_dump() if investigation.report else None,
        pull_request=investigation.pull_request.model_dump() if investigation.pull_request else None,
        timeline=[e.model_dump() for e in investigation.timeline],
        errors=investigation.errors,
    )


@router.get("/{investigation_id}/timeline")
async def get_timeline(investigation_id: str) -> list[dict]:
    """Get investigation timeline events."""
    investigation = _store.get(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return [e.model_dump() for e in investigation.timeline]


@router.get("/{investigation_id}/fix")
async def get_fix(investigation_id: str) -> dict:
    """Get the generated fix."""
    investigation = _store.get(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if not investigation.fix:
        raise HTTPException(status_code=404, detail="Fix not yet generated")
    return investigation.fix.model_dump()


@router.get("/{investigation_id}/report")
async def get_report(investigation_id: str) -> dict:
    """Get the generated report."""
    investigation = _store.get(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    if not investigation.report:
        raise HTTPException(status_code=404, detail="Report not yet generated")
    return investigation.report.model_dump()