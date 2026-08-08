"""DataHub provider protocol and fixture implementation.

The DataHub layer is behind a single interface with two implementations:
- MCPDataHubProvider (primary) - talks to DataHub MCP server
- FixtureDataHubProvider (fallback/offline/demo) - returns deterministic JSON fixtures

See docs/09_DATAHUB_SPEC.md.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Protocol
import httpx

from pydantic import BaseModel

from app.models.datahub import (
    DataAsset,
    SchemaRecord,
    LineageGraph,
    LineageEdge,
    OwnershipRecord,
    TagRecord,
    DomainRecord,
    GlossaryTerm,
)
from app.core.config import settings


class DataHubProvider(Protocol):
    """Provider-agnostic interface for retrieving DataHub metadata."""

    async def search_assets(self, query: str, limit: int = 10) -> list[DataAsset]: ...
    async def get_asset(self, urn: str) -> DataAsset: ...
    async def get_schema(self, urn: str) -> SchemaRecord: ...
    async def get_lineage(self, urn: str, direction: str = "both", depth: int = 1) -> LineageGraph: ...
    async def get_ownership(self, urn: str) -> list[OwnershipRecord]: ...
    async def get_tags(self, urn: str) -> list[TagRecord]: ...
    async def get_domain(self, urn: str) -> DomainRecord | None: ...
    async def get_glossary_terms(self, urn: str) -> list[GlossaryTerm]: ...


class DataHubUnavailableError(Exception):
    """Raised when both MCP and GraphQL are unreachable."""


class AssetNotFoundError(Exception):
    """Raised when a URN doesn't exist in the provider."""


class FixtureDataHubProvider:
    """Deterministic DataHub provider that loads fixtures from JSON files.

    Used for: local dev without DataHub, unit tests, live demo survival.
    Fixtures live under app/datahub/fixtures/.
    """

    def __init__(self, fixture_name: str | None = None) -> None:
        self._fixture_name = fixture_name or os.getenv("DATAHUB_FIXTURE", "sales_dashboard")
        self._fixture: dict | None = None
        self._load()

    def _load(self) -> None:
        fixture_dir = Path(__file__).parent.parent / "datahub" / "fixtures"
        fixture_path = fixture_dir / f"{self._fixture_name}.json"
        if not fixture_path.exists():
            raise FileNotFoundError(f"Fixture not found: {fixture_path}")
        with fixture_path.open("r", encoding="utf-8") as f:
            self._fixture = json.load(f)

        # Build lookup maps for fast access
        self._assets = {a["urn"]: a for a in self._fixture.get("assets", [])}
        # Extract schemas from assets if not at top level
        self._schemas = self._fixture.get("schemas", {})
        if not self._schemas:
            for asset_data in self._fixture.get("assets", []):
                schema = asset_data.get("schema")
                if schema:
                    self._schemas[asset_data["urn"]] = schema
        self._lineage = self._fixture.get("lineage", {})
        self._ownership = self._fixture.get("ownership", {})
        self._tags = self._fixture.get("tags", {})
        self._domains = self._fixture.get("domains", {})
        self._glossary = self._fixture.get("glossary", {})

    async def search_assets(self, query: str, limit: int = 10) -> list[DataAsset]:
        results = []
        query_lower = query.lower()
        for asset_data in self._assets.values():
            if query_lower in asset_data["name"].lower() or query_lower in asset_data["urn"].lower():
                results.append(DataAsset(**asset_data))
                if len(results) >= limit:
                    break
        return results

    async def get_asset(self, urn: str) -> DataAsset:
        if urn not in self._assets:
            raise AssetNotFoundError(f"Asset not found: {urn}")
        return DataAsset(**self._assets[urn])

    async def get_schema(self, urn: str) -> SchemaRecord:
        schema_data = self._schemas.get(urn)
        if not schema_data:
            raise AssetNotFoundError(f"Schema not found: {urn}")
        return SchemaRecord(**schema_data)

    async def get_lineage(self, urn: str, direction: str = "both", depth: int = 1) -> LineageGraph:
        lineage_data = self._lineage.get(urn, {"upstream": [], "downstream": []})
        upstream = lineage_data.get("upstream", [])
        downstream = lineage_data.get("downstream", [])
        if direction == "upstream":
            downstream = []
        elif direction == "downstream":
            upstream = []
        return LineageGraph(
            urn=urn,
            upstream=[LineageEdge(**e) for e in upstream],
            downstream=[LineageEdge(**e) for e in downstream],
        )

    async def get_ownership(self, urn: str) -> list[OwnershipRecord]:
        return [OwnershipRecord(**o) for o in self._ownership.get(urn, [])]

    async def get_tags(self, urn: str) -> list[TagRecord]:
        return [TagRecord(**t) for t in self._tags.get(urn, [])]

    async def get_domain(self, urn: str) -> DomainRecord | None:
        dom = self._domains.get(urn)
        return DomainRecord(**dom) if dom else None

    async def get_glossary_terms(self, urn: str) -> list[GlossaryTerm]:
        return [GlossaryTerm(**g) for g in self._glossary.get(urn, [])]


# --- MCP DataHub Provider (primary) ----------------------------------------


class MCPDataHubProvider:
    """Talks to DataHub MCP Server. Falls back to GraphQL for missing facets."""

    def __init__(self) -> None:
        if not settings.DATAHUB_MCP_URL:
            raise DataHubUnavailableError("DATAHUB_MCP_URL not configured")
        self._mcp_url = settings.DATAHUB_MCP_URL.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self._mcp_url,
            headers={"Authorization": f"Bearer {settings.DATAHUB_MCP_TOKEN}"} if settings.DATAHUB_MCP_TOKEN else {},
            timeout=settings.DATAHUB_TIMEOUT_SECONDS,
        )
        self._graphql_url = settings.DATAHUB_GRAPHQL_URL or ""
        self._graphql_token = settings.DATAHUB_GRAPHQL_TOKEN

    async def close(self) -> None:
        await self._client.aclose()

    # MCP tool calls
    async def _call_mcp(self, tool: str, arguments: dict) -> dict:
        try:
            resp = await self._client.post(f"/tools/{tool}", json={"arguments": arguments})
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            raise DataHubUnavailableError(f"MCP tool {tool} failed: {exc}") from exc

    # GraphQL fallback
    async def _graphql(self, query: str, variables: dict | None = None) -> dict:
        if not self._graphql_url:
            raise DataHubUnavailableError("No GraphQL fallback configured")
        headers = {"Authorization": f"Bearer {self._graphql_token}"} if self._graphql_token else {}
        async with httpx.AsyncClient(timeout=settings.DATAHUB_TIMEOUT_SECONDS) as gql:
            resp = await gql.post(self._graphql_url, json={"query": query, "variables": variables or {}}, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            if "errors" in data:
                raise DataHubUnavailableError(f"GraphQL errors: {data['errors']}")
            return data.get("data", {})

    async def search_assets(self, query: str, limit: int = 10) -> list[DataAsset]:
        data = await self._call_mcp("search_entities", {"query": query, "limit": limit})
        return [DataAsset(**a) for a in data.get("entities", [])]

    async def get_asset(self, urn: str) -> DataAsset:
        data = await self._call_mcp("get_entity", {"urn": urn})
        return DataAsset(**data)

    async def get_schema(self, urn: str) -> SchemaRecord:
        try:
            data = await self._call_mcp("get_schema_metadata", {"urn": urn})
        except DataHubUnavailableError:
            # GraphQL fallback for schema
            gql = """
            query GetSchema($urn: String!) { dataset(urn: $urn) { schemaMetadata { fields { fieldPath type nullable } } } }
            """
            data = await self._graphql(gql, {"urn": urn})
            fields = data.get("dataset", {}).get("schemaMetadata", {}).get("fields", [])
            columns = [{"name": f["fieldPath"], "type": f["type"], "nullable": f["nullable"]} for f in fields]
            return SchemaRecord(urn=urn, columns=[ColumnRecord(**c) for c in columns])
        return SchemaRecord(**data)

    async def get_lineage(self, urn: str, direction: str = "both", depth: int = 1) -> LineageGraph:
        data = await self._call_mcp("get_lineage", {"urn": urn, "direction": direction, "depth": depth})
        return LineageGraph(
            urn=urn,
            upstream=[LineageEdge(**e) for e in data.get("upstream", [])],
            downstream=[LineageEdge(**e) for e in data.get("downstream", [])],
        )

    async def get_ownership(self, urn: str) -> list[OwnershipRecord]:
        data = await self._call_mcp("get_ownership", {"urn": urn})
        return [OwnershipRecord(**o) for o in data.get("owners", [])]

    async def get_tags(self, urn: str) -> list[TagRecord]:
        data = await self._call_mcp("get_tags", {"urn": urn})
        return [TagRecord(**t) for t in data.get("tags", [])]

    async def get_domain(self, urn: str) -> DomainRecord | None:
        data = await self._call_mcp("get_domain", {"urn": urn})
        dom = data.get("domain")
        return DomainRecord(**dom) if dom else None

    async def get_glossary_terms(self, urn: str) -> list[GlossaryTerm]:
        data = await self._call_mcp("get_glossary_terms", {"urn": urn})
        return [GlossaryTerm(**g) for g in data.get("terms", [])]


# --- Factory ---------------------------------------------------------------


async def get_datahub_provider() -> DataHubProvider:
    """Select DataHub provider based on settings.PROVIDER with automatic fallback to fixtures."""
    if settings.DATAHUB_PROVIDER == "fixtures":
        return FixtureDataHubProvider()

    # Try MCP
    try:
        provider = MCPDataHubProvider()
        # Quick health check
        await provider.search_assets("test", limit=1)
        return provider
    except Exception as exc:  # noqa: BLE001
        import logging
        logger = logging.getLogger("serein_datahub.datahub")
        logger.warning("MCP provider unavailable (%s), falling back to fixtures", exc)
        return FixtureDataHubProvider()