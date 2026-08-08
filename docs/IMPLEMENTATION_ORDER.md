# Implementation Order

This document defines the prioritized implementation roadmap for Serein DataHub Agent.

It OVERRIDES the implementation order listed in `00_MASTER_PROMPT.md` for hackathon timing. The master prompt places Frontend Foundation second; that order builds UI against a non-existent API and wastes time. This roadmap is backend-and-DataHub-first, frontend-last, so every layer is built against a working predecessor.

---

# Phase 0 — Documentation & Foundation

Status: in progress.

1. Write `07_AGENT_SPEC.md` — agent I/O contracts. (done)
2. Write `08_LANGGRAPH_SPEC.md` — state schema, graph, LLM interface. (done)
3. Write `09_DATAHUB_SPEC.md` — provider interface + fixture strategy. (done)
4. Write `10_GITHUB_SPEC.md` — PR creation interface. (done)
5. Write `IMPLEMENTATION_ORDER.md` — this document. (done)
6. Fix `invetigation.py` typo -> `investigation.py`.
7. Add dependencies: `langgraph`, `httpx`, `openai`, `pygithub`, `pytest`, `pytest-asyncio`, `ruff`, `black`.
8. Extend `app/core/config.py` with all env vars from the specs.

---

# Phase 1 — Investigation Domain

9. Implement domain enums: `InvestigationStatus`, `Severity`, `AgentType`, `TaskStatus`, `ContextType`, `FixType`, `RiskLevel`.
10. Implement domain models: `Investigation`, `TimelineEvent`, `AgentTask`, `InvestigationPlan`, `DataHubContext`, `RootCauseAnalysis`, `GeneratedFix`, `FixFile`, `GeneratedReport`, `PullRequestResult`, `EvidenceItem`.
11. Implement DataHub domain records: `DataAsset`, `SchemaRecord`, `ColumnRecord`, `LineageGraph`, `LineageEdge`, `OwnershipRecord`, `TagRecord`, `DomainRecord`, `GlossaryTerm`.
12. Implement in-memory investigation store (the storage layer MVP).

---

# Phase 2 — Investigation Manager & LLM

13. Implement `LLMClient` interface + `NIMClient` (primary) + `OllamaClient` (fallback) + `StubLLMClient` (tests).
14. Implement `InvestigationManager` — owns state, calls agents in order, updates timeline, handles degraded paths.
15. Implement the LangGraph graph wiring the six agent nodes with the `should_create_pr` conditional edge.

---

# Phase 3 — DataHub Layer

16. Implement `FixtureDataHubProvider` + `loader.py` + the canonical `sales_dashboard.json` fixture.
17. Implement `MCPDataHubProvider` (MCP tool calls) with GraphQL fallback for missing facets.
18. Implement provider selection logic with automatic fixture fallback.

---

# Phase 4 — Agents (end-to-end path)

19. Implement Planner agent + `app/prompts/planner.py`.
20. Implement Investigator agent (uses DataHub provider, no LLM).
21. Implement RootCause agent + `app/prompts/root_cause.py`.
22. Implement FixGenerator agent + `app/prompts/fix_generator.py`.
23. Implement Documentation agent + `app/prompts/documentation.py`.
24. Implement GitHub agent (uses GitHub provider, no LLM).

At the end of Phase 4, one investigation runs end-to-end in the backend with no UI.

---

# Phase 5 — REST APIs

25. Implement `POST /investigations` — create and run an investigation.
26. Implement `GET /investigations` — list investigations.
27. Implement `GET /investigations/{id}` — investigation detail (full state).
28. Implement `GET /investigations/{id}/timeline` — timeline events.
29. Implement `GET /investigations/{id}/fix` — generated fix.
30. Implement `GET /investigations/{id}/report` — generated report.
31. Implement `GET /agents` — agent registry / status.
32. Keep `GET /health`.

No business logic in routes. Routes call `InvestigationService`, which calls `InvestigationManager`.

---

# Phase 6 — Frontend

33. Scaffold React + Vite + TypeScript + Tailwind + shadcn/ui. Dark theme.
34. Landing page.
35. Dashboard — list of investigations, active agents, recent reports.
36. Create Investigation page.
37. Investigation detail page — overview, timeline, agent status, DataHub context, root cause, fix, report.
38. Settings page (LLM provider, DataHub provider, GitHub repo).
39. React Query hooks against the Phase 5 APIs.

---

# Phase 7 — Tests, Polish, Submission

40. Unit tests for every agent (stub LLM, fixture DataHub, stub GitHub).
41. Unit tests for the graph (stub agents).
42. Integration test: one full investigation against fixtures, asserting COMPLETED state.
43. README — setup, env vars, demo script, architecture diagram.
44. Apache 2.0 LICENSE.
45. Demo video script and recording (user-managed).
46. Final lint + format pass (ruff, black).

---

# Demo Critical Path

The single flow that MUST work on stage, no matter what:

```
POST /investigations { "problem": "The Sales Dashboard stopped updating after yesterday's deployment." }
  -> Investigation created
  -> Planner (NIM or stub)
  -> Investigator (fixtures if DataHub down)
  -> RootCause (NIM or stub)
  -> FixGenerator (NIM or stub)
  -> Documentation (NIM or stub)
  -> GitHub (stub if no token)
  -> COMPLETED
GET /investigations/{id} -> full investigation with fix + report
```

Every external dependency (NIM, DataHub, GitHub) has a fallback that keeps this path green. This is the hackathon's survival contract.
