# SEREIN DATAHUB AGENT
# 09_DATAHUB_SPEC.md

Version 1.0

---

# PURPOSE

This document defines how the system retrieves enterprise metadata from DataHub.

DataHub is the single source of truth for enterprise metadata.

The system never hardcodes schemas.

The system never guesses lineage.

The system always retrieves metadata through the DataHub layer.

This document is the single source of truth for DataHub integration.

---

# DATAHUB PHILOSOPHY

The DataHub layer only retrieves. It never reasons.

Reasoning is the job of the LLM-based agents (see 07_AGENT_SPEC.md).

The DataHub layer:

- Receives a URN or a query.
- Calls DataHub.
- Returns structured records.
- Never interprets the records.
- Never decides root causes.
- Never generates fixes.

---

# INTEGRATION OPTIONS

DataHub exposes metadata through two interfaces:

1. **DataHub GraphQL API** — the canonical query interface.
2. **DataHub MCP Server** — the Model Context Protocol server that exposes metadata as tools to AI agents.

The system uses the **MCP Server** as the primary integration because:

- It is the hackathon's recommended integration path.
- It exposes curated tools (search, lineage, schema, ownership) instead of raw GraphQL.
- It is the interface the judges expect to see used.

A thin **GraphQL fallback** is kept for cases where the MCP server lacks a specific facet.

---

# PROVIDER INTERFACE

The DataHub layer is behind a single interface with two implementations.

```python
from typing import Protocol

class DataHubProvider(Protocol):
    async def search_assets(self, query: str, limit: int = 10) -> list[DataAsset]: ...
    async def get_asset(self, urn: str) -> DataAsset: ...
    async def get_schema(self, urn: str) -> SchemaRecord: ...
    async def get_lineage(self, urn: str, direction: str = "both", depth: int = 1) -> LineageGraph: ...
    async def get_ownership(self, urn: str) -> list[OwnershipRecord]: ...
    async def get_tags(self, urn: str) -> list[TagRecord]: ...
    async def get_domain(self, urn: str) -> DomainRecord | None: ...
    async def get_glossary_terms(self, urn: str) -> list[GlossaryTerm]: ...
```

## Implementations

### MCPDataHubProvider (primary)

- Talks to the DataHub MCP server.
- Configured via `DATAHUB_MCP_URL` env var.
- Each method maps to one MCP tool call.
- If the MCP server is unreachable, the provider raises `DataHubUnavailableError`.

### FixtureDataHubProvider (fallback / offline / demo)

- Returns deterministic, hand-authored metadata from JSON fixtures on disk.
- Fixtures live under `backend/app/datahub/fixtures/`.
- Used for:
  - Local development without a DataHub instance.
  - Unit tests.
  - Live demo survival if the DataHub instance or network is down.

### Provider Selection

```python
def get_datahub_provider() -> DataHubProvider:
    if settings.DATAHUB_PROVIDER == "fixtures":
        return FixtureDataHubProvider()
    try:
        return MCPDataHubProvider(url=settings.DATAHUB_MCP_URL)
    except DataHubUnavailableError:
        logger.warning("DataHub MCP unavailable, falling back to fixtures")
        return FixtureDataHubProvider()
```

The Investigation Manager injects the chosen provider into the Investigator agent. The Investigator never selects the provider itself.

---

# DOMAIN RECORDS

All records are Pydantic V2 models in the domain layer.

```python
class DataAsset(BaseModel):
    urn: str                           # e.g. "urn:li:dataset:(urn:li:dataPlatform:postgres,analytics.sales_data,PROD)"
    name: str                          # "analytics.sales_data"
    platform: str                      # "postgres"
    type: str                          # "dataset" | "dashboard" | "pipeline" | "ml_model"
    description: str | None
    domain_urn: str | None
    owner_urns: list[str]
    tags: list[str]
    glossary_terms: list[str]
    schema: SchemaRecord | None
    created_at: str | None
    last_modified_at: str | None
```

```python
class SchemaRecord(BaseModel):
    urn: str
    columns: list[ColumnRecord]

class ColumnRecord(BaseModel):
    name: str
    type: str
    nullable: bool
    description: str | None
    primary_key: bool
    foreign_keys: list[str]            # list of referenced column URNs
```

```python
class LineageGraph(BaseModel):
    urn: str
    upstream: list[LineageEdge]
    downstream: list[LineageEdge]

class LineageEdge(BaseModel):
    source_urn: str
    target_urn: str
    relationship: str                  # "produced_from" | "consumed_by" | "derived_from"
    pipeline_urn: str | None
```

```python
class OwnershipRecord(BaseModel):
    asset_urn: str
    owner_urn: str
    owner_name: str
    owner_type: str                    # "user" | "group" | "team"
    role: str | None                   # "DataOwner" | "DataSteward" | "BusinessOwner"
```

```python
class TagRecord(BaseModel):
    asset_urn: str
    tag_urn: str
    tag_name: str
    description: str | None
```

```python
class DomainRecord(BaseModel):
    urn: str
    name: str
    description: str | None
    parent_domain_urn: str | None
```

```python
class GlossaryTerm(BaseModel):
    urn: str
    name: str
    description: str | None
    parent_node_urn: str | None
```

---

# FIXTURE STRATEGY

Fixtures are the project's demo survival plan. They are first-class, not a hack.

## Fixture Layout

```
backend/app/datahub/fixtures/
    __init__.py
    sales_dashboard.json              # the canonical demo scenario
    broken_pipeline.json             # secondary scenario
    schema_drift.json                 # tertiary scenario
    loader.py                         # loads a fixture by name
```

## Fixture Format

Each fixture is a JSON file with this top-level shape:

```json
{
  "scenario": "sales_dashboard_stopped_updating",
  "assets": [ { ... DataAsset ... } ],
  "schemas": { "<urn>": { ... SchemaRecord ... } },
  "lineage": { "<urn>": { "upstream": [...], "downstream": [...] } },
  "ownership": { "<urn>": [ { ... OwnershipRecord ... } ] },
  "tags": { "<urn>": [ { ... TagRecord ... } ] },
  "domains": { "<urn>": { ... DomainRecord ... } },
  "glossary": { "<urn>": [ { ... GlossaryTerm ... } ] }
}
```

## Canonical Demo Scenario

`sales_dashboard.json` models the MVP scenario from the master prompt:

- `analytics.sales_data` (postgres dataset) — owner: Finance Team.
- `analytics.fct_sales` (dbt model) — depends on `analytics.sales_data`.
- `analytics.sales_dashboard` (dashboard / Looker) — depends on `analytics.fct_sales`.
- The schema for `analytics.sales_data` shows column `revenue` was renamed to `amount` on 2026-08-04.
- Lineage: `sales_data -> fct_sales -> sales_dashboard`.
- This fixture is what the live demo runs against if DataHub is unreachable.

## Fixture Selection

`FixtureDataHubProvider` loads the fixture named in `DATAHUB_FIXTURE` env var (default `sales_dashboard`). All methods read from the in-memory loaded fixture.

---

# MCP SERVER CONFIGURATION

When using the MCP provider:

- `DATAHUB_MCP_URL` — the MCP server endpoint.
- `DATAHUB_MCP_TOKEN` — auth token if the MCP server requires it.
- `DATAHUB_TIMEOUT_SECONDS` — per-call timeout (default 15).
- All MCP calls are logged with: tool name, arguments, latency, success.

The MCP provider maps each interface method to an MCP tool:

| Interface method      | MCP tool                |
|-----------------------|-------------------------|
| search_assets         | `search_entities`       |
| get_asset            | `get_entity`            |
| get_schema           | `get_schema_metadata`   |
| get_lineage          | `get_lineage`           |
| get_ownership        | `get_ownership`         |
| get_tags             | `get_tags`              |
| get_domain           | `get_domain`            |
| get_glossary_terms   | `get_glossary_terms`    |

If a tool is missing from the MCP server, the provider falls back to the GraphQL API for that specific facet (see below).

---

# GRAPHQL FALLBACK

For facets the MCP server does not expose, the system queries DataHub's GraphQL API directly.

- `DATAHUB_GRAPHQL_URL` — the GraphQL endpoint (e.g. `https://datahub.example.com/api/graphql`).
- `DATAHUB_GRAPHQL_TOKEN` — auth token.
- Uses `httpx.AsyncClient`.
- Only used when the MCP tool for a facet is unavailable, never as the primary path.

---

# ERROR HANDLING

- `DataHubUnavailableError` — MCP and GraphQL both unreachable. The provider selection logic falls back to fixtures.
- `AssetNotFoundError` — a specific URN does not exist. The Investigator logs a warning and skips that asset.
- `FacetUnavailableError` — a specific facet (e.g. glossary) is missing for an asset. The Investigator returns None for that facet and continues.

The DataHub layer never raises to the Investigation Manager. Errors are caught, logged, and returned as partial results so the pipeline continues.

---

# CACHING (FUTURE)

In the MVP, every investigation fetches fresh metadata. Phase 2 may introduce a TTL cache (e.g. 5 minutes) keyed by URN to reduce DataHub load during repeated investigations. This is NOT required for the hackathon.

---

# TESTING RULES

- All DataHub tests use `FixtureDataHubProvider`. No test depends on a live DataHub instance.
- The MCP provider is tested with a stub MCP server (a small in-process fake) under `tests/datahub/`.
- Fixture loading is tested to ensure the canonical scenario parses into valid domain records.

