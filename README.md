# Serein DataHub Agent

> **An autonomous AI Data Engineer that investigates enterprise data problems using DataHub's metadata graph, lineage, ownership, schemas, and context.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)]()
[![License](https://img.shields.io/badge/license-Apache%202.0-blue)]()
[![Python](https://img.shields.io/badge/python-3.12%2B-blue)]()
[![React](https://img.shields.io/badge/react-18%2B-blue)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-teal)]()

---

## 🎯 The Problem

Enterprise data systems are increasingly complex:
- Hundreds of datasets across warehouses, lakes, and marts
- Dozens of pipelines across Airflow, dbt, Spark, Flink
- Multiple orchestration systems and feature stores
- ML models depending on fragile upstream data

When something breaks (e.g., "Sales Dashboard stopped updating"), engineers spend **hours manually**:
- Checking schemas in DataHub
- Tracing lineage upstream/downstream
- Finding dataset owners to notify
- Reading documentation and recent deployments
- Writing fixes (SQL, dbt, Python configs)
- Creating PRs and documentation

**DataHub already stores most of this metadata. LLMs already know how to reason.** The missing piece: an **autonomous engineering platform** combining both.

---

## 🚀 The Solution: Serein DataHub Agent

Instead of chatting with AI, users create an **Investigation**:

> *"The Sales Dashboard stopped updating after yesterday's deployment."*

Serein **automatically**:
1. **Creates Investigation** with severity assessment
2. **Planner Agent** creates structured investigation plan
3. **Investigator Agent** retrieves DataHub context (schemas, lineage, ownership, tags, domains, glossary)
4. **Root Cause Agent** analyzes metadata + evidence → identifies probable root causes with confidence
5. **Fix Generator** creates production-ready fixes (SQL, dbt, Python, YAML, configs)
6. **Documentation Agent** writes comprehensive investigation report (8 sections)
7. **GitHub Agent** creates a **Pull Request** with fix + report

The engineer **reviews the output** instead of manually performing the investigation.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User (React Frontend)                    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ API Routes  │──▶│ Investigation│──▶│   LangGraph Workflow │   │
│  │             │  │   Service    │  │  (Planner → Investig-  │   │
│  └─────────────┘  └──────────────┘  │   at → RootCause →     │   │
│                                     │   FixGen → Docs → Git) │   │
│                                     └──────────┬─────────────┘   │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
                    ┌─────────────────────────────┼────────────────┐
                    ▼                             ▼                ▼
            ┌───────────────┐            ┌────────────────┐ ┌──────────┐
            │  DataHub MCP  │            │  LLM Provider  │ │  GitHub  │
            │  (or Fixtures)│            │  (NIM/Ollama)  │ │   API    │
            └───────────────┘            └────────────────┘ └──────────┘
```

### Core Principles
| Principle | Implementation |
|-----------|----------------|
| **Investigation-First** | Everything revolves around the `Investigation` object; no chat history |
| **Layered Architecture** | API → Services → Agents → Domain → Infrastructure |
| **No Agent-to-Agent** | All coordination through `InvestigationManager` |
| **Graceful Degradation** | Every external dependency has fallback (fixtures, stubs) |
| **Type Safety** | Pydantic V2 models, TypeScript strict mode |

---

## 🤖 The 6 Agents

| Agent | Responsibility | Input | Output |
|-------|---------------|-------|--------|
| **Planner** | Parse problem → create plan | User problem | `InvestigationPlan` (severity, hypotheses, required context) |
| **Investigator** | Query DataHub for metadata | Plan + asset URNs | `DataHubContext` (schemas, lineage, ownership, tags, domains, glossary) |
| **Root Cause** | Reason over context → find cause | Plan + Context | `RootCauseAnalysis` (cause, confidence, evidence, fix type) |
| **Fix Generator** | Create production-ready fix | Root cause + Context | `GeneratedFix` (files: SQL/dbt/Python/YAML + validation steps) |
| **Documentation** | Write comprehensive report | All prior outputs | `GeneratedReport` (8-section markdown) |
| **GitHub** | Create PR with fix + report | Fix + Report | `PullRequestResult` (branch, PR URL, commit SHA) |

**All agents are stateless** — they receive context, produce output, return. The `InvestigationManager` owns all state.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI, Pydantic V2, LangGraph, Uvicorn |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS v4, shadcn/ui |
| **AI/Orchestration** | LangGraph, NVIDIA NIM (qwen2.5-coder), Ollama fallback |
| **Data Integrations** | DataHub MCP Server, GraphQL fallback, JSON fixtures |
| **GitHub** | PyGithub (real) / Stub (offline) |
| **Testing** | pytest, pytest-asyncio (backend) |

---

## 📁 Project Structure

```
Serein-datahub/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes (health, investigations)
│   │   ├── core/             # Config, logging
│   │   ├── graph/            # LangGraph workflow definition
│   │   ├── llm/              # LLM abstraction (NIM/Ollama/Stub)
│   │   ├── models/           # Domain models (Pydantic V2)
│   │   │   ├── enums.py
│   │   │   ├── investigation.py
│   │   │   ├── datahub.py
│   │   │   └── agents.py
│   │   ├── prompts/          # Versioned LLM prompts
│   │   └── services/         # Business logic
│   │       ├── store.py      # In-memory investigation store
│   │       ├── manager.py    # InvestigationManager (orchestrator)
│   │       ├── datahub.py    # DataHub providers (MCP + fixtures)
│   │       └── github.py     # GitHub providers (PyGithub + stub)
│   ├── app/datahub/fixtures/ # Demo scenarios (sales_dashboard.json)
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx           # Sidebar + header + theme
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── NewInvestigation.tsx
│   │   │   │   ├── InvestigationDetail.tsx
│   │   │   │   └── Settings.tsx
│   │   │   └── ui/               # shadcn/ui components (Button, Card, etc.)
│   │   ├── hooks/                # React Query hooks
│   │   ├── services/             # API client
│   │   ├── types/                # TypeScript types matching API
│   │   └── lib/                  # Utilities
│   └── package.json
├── docs/
│   ├── 00_MASTER_PROMPT.md
│   ├── 03_BACKEND_SPEC.md
│   ├── 07_AGENT_SPEC.md
│   ├── 08_LANGGRAPH_SPEC.md
│   ├── 09_DATAHUB_SPEC.md
│   ├── 10_GITHUB_SPEC.md
│   └── IMPLEMENTATION_ORDER.md
├── README.md
└── LICENSE
```

---

## 🔧 Getting Started

### Prerequisites
- **Python 3.12+**
- **Node.js 18+**
- **Optional**: NVIDIA API key from [build.nvidia.com](https://build.nvidia.com) for production LLM quality

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env    # Add NVIDIA_API_KEY, GITHUB_TOKEN if available
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
# Opens http://localhost:5173 (proxies API to localhost:8000)
```

### Run Tests
```bash
cd backend
pytest tests/ -v
```

---

## ⚙️ Configuration

### Backend `.env`
```bash
# LLM Provider
LLM_PROVIDER=nim              # nim | ollama | stub
LLM_MODEL=qwen2.5-coder
NVIDIA_API_KEY=your-key       # Required for NIM

# DataHub
DATAHUB_PROVIDER=fixtures      # mcp | fixtures
DATAHUB_MCP_URL=http://localhost:8080
DATAHUB_FIXTURE=sales_dashboard

# GitHub (optional)
GITHUB_TOKEN=ghp_xxx
GITHUB_REPOSITORY=owner/repo

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend `.env`
```bash
VITE_API_BASE=http://localhost:8000
```

---

## 🎬 Demo Scenario

The canonical fixture `sales_dashboard.json` models:

1. **analytics.sales_data** (PostgreSQL) — column `revenue` renamed to `amount` on 2026-08-04
2. **analytics.fct_sales** (dbt) — still selects `revenue` (old name)
3. **sales_dashboard** (Looker) — executive dashboard consuming fct_sales

**Lineage**: `sales_data → fct_sales → sales_dashboard`

**Input**: `"The Sales Dashboard stopped updating after yesterday's deployment."`

**Expected Output**:
- Root cause: column rename broke downstream dbt model
- Fix: `SELECT amount AS revenue` in dbt model
- PR created with fix + full report

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/investigations/` | Create + start investigation |
| `GET` | `/investigations/` | List investigations |
| `GET` | `/investigations/{id}` | Full investigation detail |
| `GET` | `/investigations/{id}/timeline` | Timeline events |
| `GET` | `/investigations/{id}/fix` | Generated fix |
| `GET` | `/investigations/{id}/report` | Generated report |

---

## 🎨 UI Features

- **Dark/Light theme** with system preference detection
- **Glassmorphism** cards with backdrop blur
- **Smooth animations**: page transitions, staggered lists, hover effects
- **Responsive sidebar** (collapsible)
- **Real-time investigation tracking** with agent pipeline visualization
- **Code viewer** with syntax highlighting for generated fixes
- **Markdown report rendering**

---

## 🛡️ Resilience & Offline Support

| Dependency | Primary | Fallback |
|------------|---------|----------|
| **LLM** | NVIDIA NIM (qwen2.5-coder) | Ollama local / Stub (deterministic JSON) |
| **DataHub** | MCP Server | GraphQL / **Fixtures (offline demo)** |
| **GitHub** | PyGithub (real PR) | Stub (returns fake PR URL) |

**The demo works entirely offline** — no API keys required.

---

## 📄 License

Apache 2.0 — see [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- [DataHub](https://datahubproject.io/) — The metadata platform
- [NVIDIA NIM](https://build.nvidia.com/) — Free LLM inference
- [LangGraph](https://langchain-ai.github.io/langgraph/) — Agent orchestration
- [shadcn/ui](https://ui.shadcn.com/) — Beautiful components
- [Tailwind CSS](https://tailwindcss.com/) — Styling

---

*Built for the **Build with DataHub: The Agent Hackathon 2026***
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ API Routes  │─▶│ Investigation│─▶│   LangGraph Workflow │   │
│  │             │  │   Service    │  │  (Planner→Investigat-  │   │
│  └─────────────┘  └──────────────┘  │   or→RootCause→Fix→   │   │
│                                     │   Docs→GitHub)        │   │
│                                     └──────────┬────────────┘   │
└─────────────────────────────────────────────────┼────────────────┘
                                                  │
                    ┌─────────────────────────────┼────────────────┐
                    ▼                             ▼                ▼
            ┌───────────────┐            ┌────────────────┐ ┌──────────┐
            │  DataHub MCP  │            │  LLM Provider  │ │  GitHub  │
            │  (or Fixtures)│            │  (NIM/Ollama)  │ │   API    │
            └───────────────┘            └────────────────┘ └──────────┘
```

### Core Principles

- **Investigation-First**: Everything revolves around the Investigation object
- **Layered Architecture**: API → Services → Agents → Infrastructure
- **No Agent-to-Agent Communication**: All coordination through InvestigationManager
- **Graceful Degradation**: Every external dependency has a fallback (fixtures, stubs)
- **Type Safety**: Pydantic V2 models throughout, TypeScript on frontend

---

## 🛠️ Tech Stack

### Backend
- **FastAPI** - REST API with automatic OpenAPI docs
- **Pydantic V2** - Type-safe data models and validation
- **LangGraph** - Stateful agent orchestration
- **OpenAI SDK** - Unified client for NVIDIA NIM (primary) and Ollama (fallback)
- **PyGithub** - GitHub API integration
- **httpx** - Async HTTP for DataHub MCP/GraphQL
- **pytest + pytest-asyncio** - Testing

### Frontend
- **React 18 + TypeScript** - Type-safe UI
- **Vite** - Fast dev server and build
- **Tailwind CSS v4** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible components
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Lucide React** - Icons

### AI/ML
- **NVIDIA NIM** (build.nvidia.com) - Primary LLM (qwen2.5-coder)
- **Ollama** - Local fallback
- **LangGraph** - Agent workflow orchestration

### Data Integrations
- **DataHub MCP Server** - Primary metadata source
- **DataHub GraphQL** - Fallback for missing facets
- **JSON Fixtures** - Offline/demo survival (first-class!)

---

## 📁 Project Structure

```
Serein-datahub/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI routes
│   │   │   └── routes/
│   │   │       ├── health.py
│   │   │       └── investigations.py
│   │   ├── core/             # Config, logging
│   │   ├── graph/            # LangGraph workflow
│   │   │   └── workflow.py
│   │   ├── llm/              # LLM abstraction
│   │   │   └── client.py
│   │   ├── models/           # Domain models (Pydantic)
│   │   │   ├── enums.py
│   │   │   ├── investigation.py
│   │   │   ├── datahub.py
│   │   │   └── agents.py
│   │   ├── prompts/          # Versioned LLM prompts
│   │   │   ├── planner.py
│   │   │   ├── root_cause.py
│   │   │   ├── fix_generator.py
│   │   │   └── documentation.py
│   │   └── services/         # Business logic
│   │       ├── store.py      # In-memory investigation store
│   │       ├── manager.py    # InvestigationManager
│   │       ├── datahub.py    # DataHub providers
│   │       └── github.py     # GitHub providers
│   ├── app/datahub/fixtures/ # Canonical demo scenarios
│   │   └── sales_dashboard.json
│   ├── requirements.txt
│   └── tests/
│       ├── test_models.py
│       └── test_manager.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── NewInvestigation.tsx
│   │   │   │   ├── InvestigationDetail.tsx
│   │   │   │   └── Settings.tsx
│   │   │   └── ui/           # shadcn components
│   │   ├── hooks/            # React Query hooks
│   │   ├── services/         # API client
│   │   ├── types/            # TypeScript types
│   │   └── lib/              # Utilities
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── 00_MASTER_PROMPT.md
│   ├── 03_BACKEND_SPEC.md
│   ├── 07_AGENT_SPEC.md
│   ├── 08_LANGGRAPH_SPEC.md
│   ├── 09_DATAHUB_SPEC.md
│   ├── 10_GITHUB_SPEC.md
│   └── IMPLEMENTATION_ORDER.md
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- (Optional) NVIDIA API key for NIM, or Ollama for local LLM

### Backend
```bash
cd backend
pip install -r requirements.txt

# Configure (optional - has sensible defaults)
cp .env.example .env
# Edit .env with your NVIDIA_API_KEY, GITHUB_TOKEN, DATAHUB_MCP_URL

# Run development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:5173 (proxies API to localhost:8000)
```

### Run Tests
```bash
cd backend
pytest tests/ -v
```

---

## 🔧 Configuration

### Backend Environment Variables (.env)

```bash
# LLM Provider
LLM_PROVIDER=nim              # nim | ollama | stub
LLM_MODEL=qwen2.5-coder
NVIDIA_API_KEY=your-key       # Required for NIM
NIM_BASE_URL=https://integrate.api.nvidia.com/v1
OLLAMA_BASE_URL=http://localhost:11434/v1

# DataHub
DATAHUB_PROVIDER=fixtures     # mcp | fixtures
DATAHUB_MCP_URL=http://localhost:8080
DATAHUB_MCP_TOKEN=your-token
DATAHUB_GRAPHQL_URL=https://datahub.example.com/api/graphql
DATAHUB_GRAPHQL_TOKEN=your-token
DATAHUB_FIXTURE=sales_dashboard

# GitHub
GITHUB_TOKEN=ghp_xxx          # Optional - uses stub if missing
GITHUB_REPOSITORY=owner/repo
GITHUB_BASE_BRANCH=main
GITHUB_DRAFT_PR=true

# Server
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
```

### Frontend Environment Variables (.env)

```bash
VITE_API_BASE=http://localhost:8000
```

---

## 🎬 Demo Scenario

The canonical demo fixture (`sales_dashboard.json`) models:

1. **analytics.sales_data** (PostgreSQL) - Raw sales table, column `revenue` renamed to `amount` on 2026-08-04
2. **analytics.fct_sales** (dbt) - Fact table still selecting `revenue` (old name)
3. **sales_dashboard** (Looker) - Executive dashboard consuming fct_sales

**Lineage**: sales_data → fct_sales → sales_dashboard

**Expected Output**: Root cause identifies the column rename, fix updates dbt model to `SELECT amount AS revenue`, PR created with report.

---

## 🧪 Testing

```bash
# Backend unit tests (all 9+ tests pass)
cd backend && pytest tests/ -v

# Test specific components
pytest tests/test_models.py -v      # Domain models
pytest tests/test_manager.py -v     # InvestigationManager E2E
```

All tests use:
- **StubLLMClient** - Deterministic LLM responses
- **FixtureDataHubProvider** - Offline DataHub
- **StubGitHubProvider** - No GitHub account needed

---

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [00_MASTER_PROMPT.md](docs/00_MASTER_PROMPT.md) | Project vision, philosophy, principles |
| [03_BACKEND_SPEC.md](docs/03_BACKEND_SPEC.md) | Backend architecture, state machine, layers |
| [07_AGENT_SPEC.md](docs/07_AGENT_SPEC.md) | Agent I/O contracts, orchestration rules |
| [08_LANGGRAPH_SPEC.md](docs/08_LANGGRAPH_SPEC.md) | State schema, graph nodes, LLM interface |
| [09_DATAHUB_SPEC.md](docs/09_DATAHUB_SPEC.md) | DataHub providers, fixture strategy |
| [10_GITHUB_SPEC.md](docs/10_GITHUB_SPEC.md) | GitHub PR creation, branch strategy |
| [IMPLEMENTATION_ORDER.md](docs/IMPLEMENTATION_ORDER.md) | Hackathon-tuned implementation roadmap |

---

## 🏆 Hackathon Submission

**Category**: Open / Wildcard  
**Hackathon**: Build with DataHub - The Agent Hackathon 2026

### What Makes This Win

1. **Meaningful DataHub Usage** - Not a wrapper, but deep metadata + lineage + ownership + glossary integration
2. **Real Engineering Work** - Produces reviewable PRs, not chat responses
3. **Production Architecture** - Layered, typed, tested, fallback-ready
4. **End-to-End Demo** - One command runs full investigation → PR
5. **Professional UX** - Dark theme, Linear/GitHub-inspired dashboard, not a chatbot
5. **Resilience** - Fixtures + stubs mean the demo works offline, on any machine

---

## 📄 License

Apache 2.0 - See [LICENSE](LICENSE)

---

## 🙏 Acknowledgments

- [DataHub](https://datahubproject.io/) - The metadata platform
- [NVIDIA NIM](https://build.nvidia.com/) - Free LLM inference
- [LangGraph](https://langchain-ai.github.io/langgraph/) - Agent orchestration
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful components
- [Tailwind CSS](https://tailwindcss.com/) - Styling

---

*Built for the Build with DataHub: The Agent Hackathon 2026*#   S e r e i n - D a t a H u b  
 