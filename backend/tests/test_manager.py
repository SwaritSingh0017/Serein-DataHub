"""Tests for the InvestigationManager."""

import pytest
import asyncio
from app.services.manager import InvestigationManager
from app.models import Investigation
from app.llm import StubLLMClient
from app.services.datahub import FixtureDataHubProvider
from app.services.github import StubGitHubProvider
from app.models.investigation import InvestigationStatus


class TestInvestigationManager:
    @pytest.mark.asyncio
    async def test_full_pipeline_with_stubs(self):
        """Test the full investigation pipeline with stub providers."""
        # Create investigation
        inv = Investigation(
            id="inv-test-1",
            user_problem="The Sales Dashboard stopped updating after yesterday's deployment"
        )

        # Create manager with stubs
        manager = InvestigationManager(
            llm_client=StubLLMClient(),
            datahub_provider=FixtureDataHubProvider("sales_dashboard"),
            github_provider=StubGitHubProvider()
        )

        # Run investigation
        result = await manager.run(inv)

        # Verify completed
        assert result.status == InvestigationStatus.COMPLETED
        assert result.plan is not None
        assert result.context is not None
        assert result.root_cause is not None
        assert result.fix is not None
        assert result.report is not None
        assert result.pull_request is not None
        assert result.pull_request.pr_url != ""

    @pytest.mark.asyncio
    async def test_pipeline_degraded_on_missing_llm(self):
        """Test that pipeline completes even with failing LLM."""
        inv = Investigation(
            id="inv-test-2",
            user_problem="Test problem"
        )

        # Stub LLM that returns empty responses
        class BadStubLLMClient(StubLLMClient):
            async def complete(self, system_prompt, user_prompt, response_format=None):
                from app.llm.client import LLMResponse
                return LLMResponse(
                    text="not json",
                    parsed=None,
                    provider="stub",
                    model="stub"
                )

        manager = InvestigationManager(
            llm_client=BadStubLLMClient(),
            datahub_provider=FixtureDataHubProvider("sales_dashboard"),
            github_provider=StubGitHubProvider()
        )

        result = await manager.run(inv)

        # Should still complete but be degraded
        assert result.status == InvestigationStatus.COMPLETED
        assert result.degraded is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])