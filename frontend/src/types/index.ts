/** TypeScript types matching the backend API contracts */

export type InvestigationStatus =
  | "CREATED"
  | "PLANNING"
  | "COLLECTING_CONTEXT"
  | "INVESTIGATING"
  | "ANALYZING"
  | "GENERATING_FIX"
  | "GENERATING_REPORT"
  | "CREATING_PR"
  | "COMPLETED"
  | "FAILED"
  | "ARCHIVED";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FixType = "SQL" | "DBT" | "PYTHON" | "YAML" | "CONFIG" | "NONE";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface CreateInvestigationRequest {
  user_problem: string;
}

export interface CreateInvestigationResponse {
  investigation_id: string;
  status: InvestigationStatus;
  message: string;
}

export interface InvestigationSummary {
  investigation_id: string;
  user_problem: string;
  status: InvestigationStatus;
  severity?: Severity;
  created_at: string;
  updated_at: string;
  degraded: boolean;
}

export interface InvestigationDetail extends InvestigationSummary {
  plan?: InvestigationPlan;
  context?: DataHubContext;
  root_cause?: RootCauseAnalysis;
  fix?: GeneratedFix;
  report?: GeneratedReport;
  pull_request?: PullRequestResult;
  timeline: TimelineEvent[];
  errors: string[];
}

export interface InvestigationPlan {
  summary: string;
  severity: Severity;
  affected_assets: string[];
  required_context: string[];
  hypotheses: string[];
  steps: string[];
}

export interface DataHubContext {
  assets: DataAsset[];
  lineage: LineageEdge[];
  ownership: OwnershipRecord[];
  tags: TagRecord[];
  domains: DomainRecord[];
  glossary: GlossaryTerm[];
  schemas: SchemaRecord[];
  raw: Record<string, unknown>;
}

export interface DataAsset {
  urn: string;
  name: string;
  platform: string;
  type: string;
  description?: string;
  domain_urn?: string;
  owner_urns: string[];
  tags: string[];
  glossary_terms: string[];
  schema?: SchemaRecord;
  created_at?: string;
  last_modified_at?: string;
}

export interface SchemaRecord {
  urn: string;
  columns: ColumnRecord[];
}

export interface ColumnRecord {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  primary_key: boolean;
  foreign_keys: string[];
  last_modified_at?: string;
}

export interface LineageEdge {
  source_urn: string;
  target_urn: string;
  relationship: string;
  pipeline_urn?: string;
}

export interface OwnershipRecord {
  asset_urn: string;
  owner_urn: string;
  owner_name: string;
  owner_type: string;
  role?: string;
}

export interface TagRecord {
  asset_urn: string;
  tag_urn: string;
  tag_name: string;
  description?: string;
}

export interface DomainRecord {
  urn: string;
  name: string;
  description?: string;
  parent_domain_urn?: string;
}

export interface GlossaryTerm {
  urn: string;
  name: string;
  description?: string;
  parent_node_urn?: string;
}

export interface RootCauseAnalysis {
  root_cause: string;
  confidence: number;
  evidence: EvidenceItem[];
  affected_assets: string[];
  rejected_hypotheses: string[];
  recommended_fix_type: FixType;
}

export interface EvidenceItem {
  asset_urn: string;
  fact: string;
  source: string;
}

export interface GeneratedFix {
  fix_type: FixType;
  title: string;
  description: string;
  files: FixFile[];
  validation_steps: string[];
  risk: RiskLevel;
}

export interface FixFile {
  path: string;
  language: string;
  content: string;
  is_new: boolean;
}

export interface GeneratedReport {
  markdown: string;
  summary: string;
  sections: string[];
}

export interface PullRequestResult {
  repository: string;
  branch: string;
  pr_number: number;
  pr_url: string;
  commit_sha: string;
  files_changed: string[];
}

export interface TimelineEvent {
  id: string;
  investigation_id: string;
  timestamp: string;
  agent: string;
  event: string;
  status: string;
  metadata: Record<string, unknown>;
}