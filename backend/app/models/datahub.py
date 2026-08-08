"""DataHub metadata domain records.

Pure domain layer. Mirrors the records defined in docs/09_DATAHUB_SPEC.md.
These are the structured facts the Investigator agent returns; reasoning
over them happens in the LLM-based agents.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AssetType, OwnerType


class ColumnRecord(BaseModel):
    name: str
    type: str
    nullable: bool = True
    description: str | None = None
    primary_key: bool = False
    foreign_keys: list[str] = Field(default_factory=list)
    # when this column was last modified (ISO 8601), used for drift detection
    last_modified_at: str | None = None


class SchemaRecord(BaseModel):
    urn: str
    columns: list[ColumnRecord] = Field(default_factory=list)


class LineageEdge(BaseModel):
    source_urn: str
    target_urn: str
    relationship: str  # "produced_from" | "consumed_by" | "derived_from"
    pipeline_urn: str | None = None


class LineageGraph(BaseModel):
    urn: str
    upstream: list[LineageEdge] = Field(default_factory=list)
    downstream: list[LineageEdge] = Field(default_factory=list)


class OwnershipRecord(BaseModel):
    asset_urn: str
    owner_urn: str
    owner_name: str
    owner_type: OwnerType = OwnerType.TEAM
    role: str | None = None  # "DataOwner" | "DataSteward" | "BusinessOwner"


class TagRecord(BaseModel):
    asset_urn: str
    tag_urn: str
    tag_name: str
    description: str | None = None


class DomainRecord(BaseModel):
    urn: str
    name: str
    description: str | None = None
    parent_domain_urn: str | None = None


class GlossaryTerm(BaseModel):
    urn: str
    name: str
    description: str | None = None
    parent_node_urn: str | None = None


class DataAsset(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    urn: str
    name: str
    platform: str
    type: AssetType = AssetType.DATASET
    description: str | None = None
    domain_urn: str | None = None
    owner_urns: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    glossary_terms: list[str] = Field(default_factory=list)
    # kept as schema_record in Python; serialized as "schema" in JSON per spec
    schema_record: SchemaRecord | None = Field(default=None, alias="schema")
    created_at: str | None = None
    last_modified_at: str | None = None
