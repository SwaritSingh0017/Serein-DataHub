"""Tests for the Investigation domain models."""

from app.models import (
    Investigation,
    InvestigationPlan,
    DataHubContext,
    RootCauseAnalysis,
    GeneratedFix,
    FixFile,
    GeneratedReport,
    DataAsset,
    SchemaRecord,
    ColumnRecord,
    Severity,
    InvestigationStatus,
    FixType,
    RiskLevel,
)

import pytest


class TestInvestigation:
    def test_create_investigation(self):
        inv = Investigation(id="inv-1", user_problem="Test problem")
        assert inv.id == "inv-1"
        assert inv.user_problem == "Test problem"
        assert inv.status == InvestigationStatus.CREATED
        assert inv.degraded is False

    def test_investigation_add_event(self):
        inv = Investigation(id="inv-1", user_problem="Test problem")
        from app.models import TimelineEvent
        from datetime import datetime, timezone

        event = TimelineEvent(
            id="evt-1",
            investigation_id="inv-1",
            timestamp=datetime.now(timezone.utc),
            agent="PLANNER",
            event="Planner started",
            status="RUNNING",
        )
        inv.add_event(event)
        assert len(inv.timeline) == 1
        assert inv.timeline[0].agent == "PLANNER"

    def test_investigation_mark_degraded(self):
        inv = Investigation(id="inv-1", user_problem="Test problem")
        inv.mark_degraded()
        assert inv.degraded is True


class TestInvestigationPlan:
    def test_default_plan(self):
        plan = InvestigationPlan(summary="Test", severity=Severity.MEDIUM)
        assert plan.severity == Severity.MEDIUM
        assert plan.affected_assets == []
        assert plan.required_context == []


class TestDataHubContext:
    def test_empty_context(self):
        ctx = DataHubContext()
        assert ctx.assets == []
        assert ctx.lineage == []
        assert ctx.ownership == []


class TestGeneratedFix:
    def test_fix_with_files(self):
        fix = GeneratedFix(
            fix_type=FixType.SQL,
            title="Test fix",
            description="Fix description",
            files=[
                FixFile(path="test.sql", language="sql", content="SELECT 1", is_new=False)
            ],
            validation_steps=["Run test"],
            risk=RiskLevel.LOW,
        )
        assert len(fix.files) == 1
        assert fix.files[0].path == "test.sql"


class TestDataAsset:
    def test_asset_creation(self):
        asset = DataAsset(
            urn="urn:li:dataset:test",
            name="test_table",
            platform="postgres",
        )
        assert asset.urn == "urn:li:dataset:test"
        assert asset.name == "test_table"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])