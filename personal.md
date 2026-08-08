# Serein DataHub Agent - Personal Project Guide

> **Everything you need to know about this project, how it works, what keys you need, and how to run it.**

---

## 🎯 What Is This Project?

**Serein DataHub Agent** is an **autonomous AI Data Engineer** built for the **Build with DataHub: The Agent Hackathon 2026**.

Instead of chatting with an AI, you create an **Investigation** (a structured engineering task). The system then autonomously:
1. Plans the investigation
2. Queries DataHub for metadata (schemas, lineage, ownership, tags, domains, glossary)
3. Analyzes the evidence to find the root cause
4. Generates a production-ready fix (SQL, dbt, Python, YAML, config)
5. Writes a comprehensive report
6. Creates a GitHub Pull Request with the fix and report

**You review the output instead of manually doing the investigation.**

---

## 🏗️ How It Works (The Pipeline)

```
User enters problem: "Sales Dashboard stopped updating after deployment"
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                     INVESTIGATION MANAGER                    │
│           (owns state, coordinates all agents)               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
    ┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐    ┌───────────────┐    ┌─────────┐
    │ PLANNER │──▶│ INVESTIGATOR │──▶│ ROOT CAUSE  │──▶│ FIX GENERATOR │──▶│ DOCUMENTATION │──▶│ GITHUB  │
    └─────────┘    └──────────────┘    └─────────────┘    └──────────────┘    └───────────────┘    └─────────┘
       │                │                   │                  │                  │                   │
       ▼                ▼                   ▼                  ▼                  ▼                   ▼
  Severity +      DataHub metadata    Evidence +         Code files          8-section           PR with
  hypotheses      (schemas, lineage,    confidence       (SQL/dbt/Python/    markdown report    fix + report
  + required      ownership, tags,      + fix type       YAML/configs)       + summary
  context         domains, glossary)
```

### Each Agent:
| Agent | What It Does | LLM Used? |
|-------|--------------|-----------|
| **Planner** | Parses natural language → structured plan with severity, hypotheses, required context | ✅ Yes |
| **Investigator** | Queries DataHub for all relevant metadata (no reasoning, just retrieval) | ❌ No |
| **Root Cause** | Analyzes evidence → finds probable root cause with confidence score | ✅ Yes |
| **Fix Generator** | Creates production-ready code files (not diffs) | ✅ Yes |
| **Documentation** | Writes 8-section markdown report with executive summary | ✅ Yes |
| **GitHub** | Creates branch, commits files, opens draft PR | ❌ No |

---

## 🔑 API Keys You Need & Where to Get Them

### 1. **NVIDIA API Key (Required for production LLM)**
- **Where**: https://build.nvidia.com
- **What**: Free tier available, gives access to qwen2.5-coder and other models via NIM (NVIDIA Inference Microservices)
- **Why**: Primary LLM provider for all 4 LLM-based agents
- **Env var**: `NVIDIA_API_KEY`

### 2. **GitHub Personal Access Token (Optional - for real PRs)**
- **Where**: GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
- **Scopes needed**: `repo` (full control), or fine-grained with `contents:write` + `pull_requests:write`
- **Why**: Creates real branches, commits, and Pull Requests
- **Env var**: `GITHUB_TOKEN`
- **Also need**: `GITHUB_REPOSITORY` (format: `owner/repo`)

### 3. **DataHub MCP Server (Optional - for real metadata)**
- **Where**: Your DataHub instance - enable MCP server in DataHub settings
- **Why**: Primary metadata source (instead of fixtures)
- **Env vars**: `DATAHUB_MCP_URL`, `DATAHUB_MCP_TOKEN`

### 4. **Ollama (Optional - local LLM fallback)**
- **Where**: https://ollama.com - install locally, then `ollama pull qwen2.5-coder`
- **Why**: Fully offline LLM fallback if NVIDIA NIM unavailable
- **Env var**: `OLLAMA_BASE_URL` (default: http://localhost:11434/v1)

---

## ⚙️ Configuration Files

### Backend: `backend/.env`
```bash
# Copy from .env.example and fill in:
LLM_PROVIDER=nim              # nim | ollama | stub
LLM_MODEL=qwen2.5-coder
NVIDIA_API_KEY=your-key-here  # <-- REQUIRED for production

DATAHUB_PROVIDER=fixtures      # mcp | fixtures
DATAHUB_MCP_URL=http://localhost:8080
DATAHUB_FIXTURE=sales_dashboard

GITHUB_TOKEN=ghp_xxx          # Optional
GITHUB_REPOSITORY=owner/repo  # Optional

HOST=0.0.0.0
PORT=8000
```

### Frontend: `frontend/.env`
```bash
VITE_API_BASE=http://localhost:8000
```

---

## 🚀 How to Run Everything

### Prerequisites
- Python 3.12+
- Node.js 18+
- (Optional) NVIDIA API key

### Terminal 1 - Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your NVIDIA_API_KEY
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
→ API runs at http://localhost:8000
→ Docs at http://localhost:8000/docs

### Terminal 2 - Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
→ UI runs at http://localhost:5173
→ Proxies API calls to localhost:8000

### Test the Pipeline
1. Open http://localhost:5173
2. Click "New Investigation" (or navigate to /dashboard then "New Investigation")
3. Paste: `"The Sales Dashboard stopped updating after yesterday's deployment."`
4. Click "Start Investigation"
5. Watch the 6 agents run in real-time
6. Click the investigation to see: DataHub context, root cause, generated fix, report, PR link

---

## 🎬 Demo Scenario (Works Offline!)

The included fixture `backend/app/datahub/fixtures/sales_dashboard.json` models:

| Asset | Platform | Issue |
|-------|----------|-------|
| `analytics.sales_data` | PostgreSQL | Column `revenue` renamed to `amount` on 2026-08-04 |
| `analytics.fct_sales` | dbt | Still selects `revenue` (old column name) |
| `sales_dashboard` | Looker | Executive dashboard reading from fct_sales |

**Lineage**: `sales_data → fct_sales → sales_dashboard`

**Input**: `"The Sales Dashboard stopped updating after yesterday's deployment."`

**Expected Output**:
- Root cause: Column `revenue` renamed to `amount`; downstream dbt model still references old name
- Fix: Update `models/marts/fct_sales.sql` → `SELECT amount AS revenue`
- PR created with fix + full 8-section report

---

## 📁 Key Files You'll Touch

| File | Purpose |
|------|---------|
| `backend/app/services/manager.py` | InvestigationManager - orchestrates all agents |
| `backend/app/graph/workflow.py` | LangGraph workflow definition |
| `backend/app/llm/client.py` | LLM abstraction (NIM/Ollama/Stub) |
| `backend/app/services/datahub.py` | DataHub providers (MCP + Fixtures) |
| `backend/app/services/github.py` | GitHub providers (PyGithub + Stub) |
| `backend/app/prompts/*.py` | Versioned LLM prompts for each agent |
| `backend/app/datahub/fixtures/*.json` | Demo scenarios |
| `frontend/src/components/pages/*.tsx` | UI pages (Dashboard, NewInvestigation, Detail, Settings, **LandingPage**) |
| `frontend/src/components/Layout.tsx` | Sidebar, theme toggle, navigation |
| `frontend/src/index.css` | Glassmorphism theme, animations, dark/light tokens |

---

## 🛡️ Resilience - What Happens When Things Fail

| If This Fails... | System Does This |
|------------------|------------------|
| NVIDIA NIM down | Falls back to Ollama → then Stub (deterministic JSON) |
| DataHub unreachable | Uses `fixtures/sales_dashboard.json` (guaranteed to work) |
| GitHub API fails | Returns fake PR URL, investigation still completes |
| LLM returns bad JSON | Retries once with repair prompt → then degraded path |

**The demo works 100% offline with zero API keys.**

---

## 🧪 Running Tests

```bash
cd backend
pytest tests/ -v
# 9 tests covering models + full pipeline with stubs
```

---

## 📦 Building for Production

```bash
# Backend - already runs with uvicorn
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm run build
# Output in dist/ - serve with nginx or any static host
```

---

## 🎯 Hackathon Submission Checklist

- [x] Public GitHub repo with Apache 2.0 license
- [x] Working application (this repo ✓)
- [x] Good README (created ✓)
- [ ] Demo video (you record - 3 min max)
- [x] Uses DataHub meaningfully (MCP + fixtures ✓)
- [x] Original approach (Investigation-first, not chat ✓)
- [x] Landing page with hero, features, architecture, tech stack, CTA ✓

---

## 🆘 Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| "NVIDIA_API_KEY not set" | Add key to backend/.env or system falls back to Stub |
| Frontend can't reach API | Check `VITE_API_BASE` in frontend/.env matches backend port |
| Theme not switching | Hard refresh (Ctrl+Shift+R) - Tailwind v4 caches aggressively |
| Port 8000/5173 in use | Change PORT in .env or kill existing process |
| Module not found | Run `pip install -r requirements.txt` / `npm install` |

---

## 📞 Need Help?

- **Backend logs**: Check terminal running uvicorn
- **Frontend errors**: Open browser DevTools (F12) → Console
- **API docs**: http://localhost:8000/docs (FastAPI auto-generated)
- **Architecture decisions**: See `docs/07_AGENT_SPEC.md`, `docs/08_LANGGRAPH_SPEC.md`, `docs/09_DATAHUB_SPEC.md`

---

## 💡 Key Mental Model

**This is NOT a chatbot.** 
- No conversation history
- No "continue the conversation"
- Each Investigation is a complete, independent engineering task
- The Investigation object IS the state - everything flows through it
- Agents are pure functions: Input → Output (no side effects)

---

## ✅ Current Status - What's Done vs Pending

### ✅ DONE (Priorities 1-7 Complete)
- Backend core engine (Investigation, Manager, Timeline, Reports)
- Agent Engine (all 6 agents with prompts)
- DataHub integration (MCP + fixtures + schema/lineage/ownership)
- GitHub integration (branch, commit, PR)
- REST APIs (investigations CRUD + timeline/fix/report)
- Frontend pages (Dashboard, NewInvestigation, InvestigationDetail, Settings, **LandingPage**)
- Theme & UI (glassmorphism, dark/light, animations, transitions)
- API Integration (React Query hooks, real backend consumption)
- UX (loading, errors, empty states, responsive, dark theme, transitions)
- Project quality (type hints, logging, 9 tests, README, LICENSE, env config)

### 🔄 IN PROGRESS / PENDING
| Priority | Task | Status |
|----------|------|--------|
| 2 | Landing Page | ✅ **DONE** - Hero, Features, Architecture, Tech Stack, CTA |
| 2 | Reports Page | ⏳ Pending - List, markdown viewer, export/download |
| 3 | Missing UI components | ⏳ Pending - Dialog, ErrorBoundary, Skeleton |
| 3 | Docker Support | ⏳ Pending - Dockerfile, docker-compose.yml |
| 4 | Integration tests | ⏳ Pending - Full E2E flow |
| 5 | Demo readiness verification | ⏳ Pending - Full story flow |
| 6 | Nice-to-haves | ⏳ Pending - Search, filter, export PDF, copy code, keyboard shortcuts |

### 🎯 Next Steps for You
1. **Add NVIDIA_API_KEY** to `backend/.env` for production LLM quality
2. **Run the app** - follow the "How to Run Everything" section
3. **Record demo video** (3 min max) following the exact story flow
4. Push to GitHub with Apache 2.0 license
4. Submit!

---

*Last updated: 2026-08-07*
*Built for: Build with DataHub - The Agent Hackathon 2026*