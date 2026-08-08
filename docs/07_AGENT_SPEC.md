# SEREIN DATAHUB AGENT
# 07_AGENT_SPEC.md

Version 1.0

---

# PURPOSE

This document defines the behavior, inputs, outputs, and orchestration rules for every AI agent in the system.

Agents are stateless workers.

Agents never own state.

Agents never communicate directly.

The Investigation Manager owns all state and coordinates all agents.

This document is the single source of truth for agent implementation.

---

# AGENT PHILOSOPHY

An agent is a function.

```
AgentInput  ->  Agent  ->  AgentOutput
```

Nothing more.

Agents:

- Receive context from the Investigation Manager
- Produce a structured output
- Return that output to the Investigation Manager
- Never mutate the Investigation directly
- Never call each other
- Never persist state between runs

The Investigation Manager:

- Holds the Investigation
- Calls each agent in order
- Collects each agent output
- Updates the Investigation
- Appends TimelineEvents
- Handles failures and retries

---

# AGENT INVENTORY

| # | Agent            | Responsibility                          | Produces                  |
|---|------------------|-----------------------------------------|---------------------------|
| 1 | Planner          | Parse user problem, create plan         | InvestigationPlan         |
| 2 | Investigator     | Retrieve DataHub context                | DataHubContext            |
| 3 | RootCause        | Reason over context, find root cause    | RootCauseAnalysis         |
| 4 | FixGenerator     | Generate production-ready fix           | GeneratedFix              |
| 5 | Documentation    | Write investigation report              | GeneratedReport           |
| 6 | GitHub           | Create branch, commit, pull request     | PullRequestResult         |

The GitHub Agent is the only agent that does not call the LLM.
It calls the GitHub API using the output of the FixGenerator.

---

# SHARED CONTRACTS

These types are shared across agents and live in the domain layer.

## AgentTask

Represents one unit of work performed by one agent.

```python
class AgentTask(BaseModel):
    id: str
    investigation_id: str
    agent: AgentType          # enum: PLANNER | INVESTIGATOR | ROOT_CAUSE | FIX | DOCS | GITHUB
    status: TaskStatus        # enum: PENDING | RUNNING | COMPLETED | FAILED
    started_at: datetime | None
    completed_at: datetime | None
    error: str | None
```

## AgentResult

Every agent returns a subclass of AgentResult.

```python
class AgentResult(BaseModel):
    agent: AgentType
    success: bool
    duration_ms: int
    error: str | None
```

Each agent defines its own concrete result type that extends AgentResult with agent-specific fields.

---

# 1. PLANNER AGENT

## Responsibility

Read the user's natural-language problem and produce a structured investigation plan.

## Input

```python
class PlannerInput(BaseModel):
    investigation_id: str
    user_problem: str
    created_at: datetime
```

## Output

```python
class InvestigationPlan(BaseModel):
    summary: str                       # one-line restatement of the problem
    severity: Severity                 # enum: LOW | MEDIUM | HIGH | CRITICAL
    affected_assets: list[str]        # DataHub URNs the planner suspects (may be empty)
    required_context: list[ContextType]  # enum: SCHEMA | LINEAGE | OWNERSHIP | TAGS | DOMAINS | GLOSSARY | DEPLOYMENTS
    hypotheses: list[str]             # initial hypotheses to investigate
    steps: list[str]                  # ordered investigation steps
```

## Behavior

1. Call LLM with the user problem and a planning prompt.
2. Parse the LLM response into InvestigationPlan.
3. If parsing fails, retry once with a stricter prompt.
4. If retry fails, return a minimal default plan (severity MEDIUM, all context types, no hypotheses).

## Failure Mode

- LLM unreachable -> default plan, log warning, mark task COMPLETED with `degraded=True`.
- Never raise. The pipeline must continue.

---

# 2. INVESTIGATOR AGENT

## Responsibility

Retrieve enterprise context from DataHub using the plan's `required_context` and `affected_assets`.

This agent does NOT reason. It only retrieves.

## Input

```python
class InvestigatorInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan
```

## Output

```python
class DataHubContext(BaseModel):
    assets: list[DataAsset]            # schemas + metadata for each affected asset
    lineage: list[LineageEdge]         # upstream/downstream relationships
    ownership: list[OwnershipRecord]   # who owns each asset
    tags: list[TagRecord]              # glossary terms / tags on assets
    domains: list[DomainRecord]        # business domains
    glossary: list[GlossaryTerm]       # business glossary entries
    raw: dict                           # raw DataHub responses, for audit/debug
```

## Behavior

1. For each asset URN in `plan.affected_assets`, fetch schema, ownership, tags, domain.
2. For each required ContextType in `plan.required_context`, fetch the corresponding DataHub facet.
3. Expand lineage one hop upstream and one hop downstream of each affected asset.
4. Merge all results into a single DataHubContext.
5. If an asset URN is unknown, log a warning and skip it (do not fail).

## Failure Mode

- DataHub unreachable -> use fixture provider (see 09_DATAHUB_SPEC.md).
- Partial DataHub failure -> return whatever was retrieved, log missing facets.
- Never raise. The pipeline must continue with partial context.

---

# 3. ROOT CAUSE AGENT

## Responsibility

Reason over the DataHub context and the plan's hypotheses to identify the most probable root cause.

## Input

```python
class RootCauseInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan
    context: DataHubContext
```

## Output

```python
class RootCauseAnalysis(BaseModel):
    root_cause: str                    # plain-language description
    confidence: float                  # 0.0 - 1.0
    evidence: list[EvidenceItem]       # facts from DataHub that support the conclusion
    affected_assets: list[str]         # URNs confirmed affected
    rejected_hypotheses: list[str]     # hypotheses considered and dismissed, with reasons
    recommended_fix_type: FixType      # enum: SQL | DBT | PYTHON | YAML | CONFIG | NONE
```

```python
class EvidenceItem(BaseModel):
    asset_urn: str
    fact: str                          # e.g. "column `revenue` was renamed to `amount` on 2026-08-04"
    source: str                        # "DataHub lineage" | "DataHub schema" | "DataHub ownership"
```

## Behavior

1. Build a prompt containing: the plan, the hypotheses, and a serialized DataHubContext.
2. Call LLM with a root-cause prompt that demands evidence-cited reasoning.
3. Parse into RootCauseAnalysis.
4. If confidence < 0.3, mark the investigation as LOW_CONFIDENCE but continue.

## Failure Mode

- LLM unreachable -> return RootCauseAnalysis with confidence 0.0, root_cause "Unable to determine root cause: LLM unavailable."
- Unparseable response -> retry once, then fall back to the same low-confidence result.
- Never raise.

---

# 4. FIX GENERATOR

## Responsibility

Generate a production-ready fix based on the root cause and the DataHub context.

## Input

```python
class FixGeneratorInput(BaseModel):
    investigation_id: str
    root_cause: RootCauseAnalysis
    context: DataHubContext
```

## Output

```python
class GeneratedFix(BaseModel):
    fix_type: FixType
    title: str                         # short PR title
    description: str                   # what the fix does and why
    files: list[FixFile]               # the actual code changes
    validation_steps: list[str]        # how to verify the fix
    risk: RiskLevel                    # enum: LOW | MEDIUM | HIGH
```

```python
class FixFile(BaseModel):
    path: str                          # repo-relative path, e.g. "models/marts/sales.sql"
    language: str                      # sql | python | yaml | json | markdown
    content: str                       # full file content
    is_new: bool                       # True if the file does not yet exist in the repo
```

## Behavior

1. Build a prompt containing the root cause, the relevant schemas, and the affected assets.
2. Call LLM with a fix-generation prompt that requires complete file contents (not diffs).
3. Parse into GeneratedFix.
4. Validate that every FixFile has a path and non-empty content.
5. If the root cause's recommended_fix_type is NONE, return a no-op fix with a single markdown file explaining that no code change is required.

## Failure Mode

- LLM unreachable -> return GeneratedFix with empty files list, risk HIGH, description "Fix generation failed: LLM unavailable."
- Unparseable response -> retry once, then return the same failure fix.
- Never raise.

---

# 5. DOCUMENTATION AGENT

## Responsibility

Produce a human-readable investigation report.

## Input

```python
class DocumentationInput(BaseModel):
    investigation_id: str
    plan: InvestigationPlan
    context: DataHubContext
    root_cause: RootCauseAnalysis
    fix: GeneratedFix
```

## Output

```python
class GeneratedReport(BaseModel):
    markdown: str                      # full report in GitHub-flavored markdown
    summary: str                       # one-paragraph executive summary
    sections: list[str]                # ordered section headings
```

## Report Structure

The markdown MUST contain these sections in order:

1. Summary
2. Problem Statement
3. Investigation Steps
4. DataHub Evidence
5. Root Cause
6. Proposed Fix
7. Validation Steps
8. Recommendations

## Behavior

1. Build a prompt containing the plan, a compact serialization of the context, the root cause, and the fix.
2. Call LLM with a documentation prompt that enforces the section structure.
3. Parse into GeneratedReport.
4. Validate that all 8 sections appear in the markdown.

## Failure Mode

- LLM unreachable -> generate a minimal report from the structured inputs (no LLM call) so the investigation still has documentation.
- Never raise.

---

# 6. GITHUB AGENT

## Responsibility

Create a branch, commit the generated fix files, and open a pull request.

This agent does NOT call the LLM. It calls the GitHub API.

## Input

```python
class GitHubAgentInput(BaseModel):
    investigation_id: str
    fix: GeneratedFix
    report: GeneratedReport
    base_branch: str                   # default "main"
```

## Output

```python
class PullRequestResult(BaseModel):
    repository: str                    # "owner/repo"
    branch: str
    pr_number: int
    pr_url: str
    commit_sha: str
    files_changed: list[str]
```

## Behavior

1. Create a branch named `investigation/<investigation_id>` off the base branch.
2. For each FixFile, create or update the file via the GitHub API.
3. Append the report markdown as `INVESTIGATION_REPORT.md` in the branch.
4. Open a pull request with the fix title and description.
5. Return the PullRequestResult.

## Failure Mode

- GitHub API unreachable -> return PullRequestResult with all fields empty, log error. The investigation is still marked COMPLETED (the PR is a side effect, not the core deliverable).
- Missing credentials -> same as above.
- Never raise.

---

# ORCHESTRATION RULES

## Ordering

The Investigation Manager calls agents in this fixed order:

```
Planner -> Investigator -> RootCause -> FixGenerator -> Documentation -> GitHub
```

No agent may run before its predecessor has returned.

## State Transitions

Each agent call corresponds to one Investigation state transition:

| Agent            | From state          | To state            |
|------------------|---------------------|---------------------|
| Planner          | CREATED             | PLANNING            |
| (Planner done)   | PLANNING            | COLLECTING_CONTEXT  |
| Investigator     | COLLECTING_CONTEXT  | INVESTIGATING       |
| (Investigator)   | INVESTIGATING       | ANALYZING           |
| RootCause        | ANALYZING           | GENERATING_FIX      |
| FixGenerator     | GENERATING_FIX      | GENERATING_REPORT   |
| Documentation    | GENERATING_REPORT   | CREATING_PR         |
| GitHub           | CREATING_PR         | COMPLETED           |

On any unrecoverable failure, the state becomes FAILED.

## Retries

- Each LLM-based agent retries once on parse failure.
- Network failures to DataHub or GitHub do NOT retry the agent; they fall back to the documented degraded path.
- The Investigation Manager never retries an agent more than once.

## Concurrency

In the MVP, agents run sequentially. The architecture must not preclude future parallelism (e.g. Investigator fetching schema and lineage concurrently), but the Manager calls agents one at a time.

---

# LLM USAGE

All LLM-based agents (Planner, RootCause, FixGenerator, Documentation) use the shared LLM interface defined in `08_LANGGRAPH_SPEC.md`.

- Provider is configurable via env var `LLM_PROVIDER` (default `nim`, fallback `ollama`).
- Model is configurable via env var `LLM_MODEL` (default `qwen2.5-coder`).
- Every prompt is versioned and stored under `app/prompts/`.
- Every LLM call is logged with: agent name, prompt version, token counts, latency, success.

The Investigator and GitHub agents do NOT use the LLM.

---

# TESTING RULES

Every agent must be unit-testable without:

- A live LLM (use a stub LLM client returning canned responses)
- A live DataHub (use the fixture provider)
- A live GitHub (use a stub GitHub client)

Agent tests live under `tests/agents/` and follow the naming pattern `test_<agent_name>_agent.py`.
