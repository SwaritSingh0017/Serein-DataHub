# SEREIN DATAHUB AGENT
# 03_SYSTEM_ARCHITECTURE.md

Version 1.0

---

# PURPOSE

This document defines the complete system architecture.

It is the single source of truth for:

- Backend Architecture
- Frontend Architecture
- AI Architecture
- Data Flow
- Service Communication
- Responsibility Boundaries

The implementation AI MUST NOT redesign this architecture.

---

# ARCHITECTURE PHILOSOPHY

The system is NOT chatbot-centric.

The system is Investigation-centric.

Everything begins with an Investigation.

The Investigation becomes the container that coordinates:

• AI Agents
• DataHub Context
• GitHub Actions
• Generated Fixes
• Timeline
• Reports

No module owns the Investigation except the Investigation Manager.

---

# HIGH LEVEL SYSTEM

                         User
                           │
                           ▼
                  React Frontend
                           │
                           ▼
                    FastAPI Backend
                           │
                           ▼
                Investigation Manager
                           │
        ┌──────────────────┼────────────────────┐
        ▼                  ▼                    ▼
   Planner Agent    Investigation Agent   Timeline Manager
        │                  │                    │
        ▼                  ▼                    ▼
                DataHub Context Layer
                           │
        ┌──────────────────┼────────────────────┐
        ▼                  ▼                    ▼
 Metadata Service     Lineage Service     Ownership Service
                           │
                           ▼
                   Root Cause Agent
                           │
                           ▼
                    Fix Generator
                           │
                           ▼
                 Documentation Agent
                           │
                           ▼
                    GitHub Service
                           │
                           ▼
                  Pull Request Output

---

# CORE PRINCIPLE

Everything is built around

Investigation

NOT Agent.

NOT Chat.

NOT Prompt.

NOT LLM.

---

# LAYERS

Presentation Layer

↓

API Layer

↓

Application Layer

↓

Domain Layer

↓

Infrastructure Layer

↓

External Services

---

# PRESENTATION LAYER

React

Responsibilities

Render UI

Collect user input

Display investigations

Display timeline

Display generated fixes

Display reports

Never contain business logic.

---

# API LAYER

FastAPI Routers

Responsibilities

Receive requests

Validate requests

Return responses

Call services

Never perform business logic.

---

# APPLICATION LAYER

Services

Responsibilities

Coordinate business logic

Create investigations

Manage workflows

Coordinate agents

Update investigation state

---

# DOMAIN LAYER

Contains

Models

Enums

Entities

Domain Objects

Pure business concepts.

No framework code.

---

# INFRASTRUCTURE LAYER

Contains

DataHub

GitHub

LLM

Storage

Logging

Configuration

External integrations.

---

# FRONTEND ARCHITECTURE

Frontend

│

├── App

├── Pages

├── Components

├── Features

├── Hooks

├── Services

├── Types

├── Theme

└── Utils

---

# PAGES

Landing

Dashboard

Investigation

Timeline

History

Generated Fix

Settings

404

---

# COMPONENTS

Navbar

Sidebar

Header

Footer

Timeline

StatusBadge

InvestigationCard

AgentCard

ProgressBar

Loader

CodeViewer

MarkdownViewer

Modal

Toast

Buttons

Inputs

Tables

Charts

---

# FEATURE MODULES

Investigation

Timeline

Agents

Reports

Settings

Authentication

Dashboard

---

# BACKEND ARCHITECTURE

backend

↓

API

↓

Services

↓

Domain

↓

Infrastructure

↓

External Systems

---

# ROUTERS

health.py

investigations.py

timeline.py

agents.py

github.py

settings.py

status.py

reports.py

---

# SERVICES

InvestigationService

PlannerService

TimelineService

DataHubService

RootCauseService

FixGenerationService

DocumentationService

GitHubService

ReportService

---

# DOMAIN MODELS

Investigation

TimelineEvent

AgentTask

GeneratedFix

GeneratedReport

DataAsset

PipelineContext

InvestigationSummary

---

# INVESTIGATION MANAGER

The Investigation Manager is the heart of the backend.

Responsibilities

Create Investigation

Assign IDs

Manage state

Dispatch agents

Collect outputs

Update timeline

Store context

Generate summary

No agent directly modifies Investigation.

Everything goes through Investigation Manager.

---

# AGENT ARCHITECTURE

Planner

↓

Investigator

↓

Root Cause

↓

Fix Generator

↓

Documentation

↓

GitHub

Each agent receives

Context

↓

Produces Output

↓

Returns Output

↓

Investigation Manager updates Investigation

Agents never communicate directly.

---

# DATA FLOW

User

↓

POST /investigations

↓

InvestigationService

↓

Planner Agent

↓

Investigation Created

↓

Timeline Updated

↓

DataHub Context

↓

Investigator

↓

Metadata

↓

Root Cause

↓

Generated Fix

↓

Documentation

↓

GitHub

↓

Completed

---

# STATE MACHINE

CREATED

↓

PLANNING

↓

COLLECTING_CONTEXT

↓

INVESTIGATING

↓

ANALYZING

↓

GENERATING_FIX

↓

GENERATING_REPORT

↓

CREATING_PR

↓

COMPLETED

↓

ARCHIVED

Failure

↓

FAILED

---

# DATAHUB LAYER

Responsibilities

Retrieve

Schemas

Ownership

Lineage

Domains

Glossary

Tags

Assets

Never perform reasoning.

Only retrieve context.

---

# LLM LAYER

Responsibilities

Reason

Summarize

Generate

Explain

Never retrieve enterprise metadata.

---

# GITHUB LAYER

Responsibilities

Branch

Commit

PR

Review

Never generate fixes.

---

# STORAGE LAYER

Current MVP

In-memory

Phase 2

SQLite

Future

PostgreSQL

---

# LOGGING

Every request

Every agent

Every transition

Every error

Every generated fix

Every external request

Structured logging only.

---

# CONFIGURATION

Environment Variables

LLM

DataHub

GitHub

Logging

Server

Theme

Everything configurable.

---

# SECURITY

Validate every request.

Never expose secrets.

Never hardcode credentials.

Use environment variables.

---

# UI FLOW

Landing

↓

Dashboard

↓

Create Investigation

↓

Investigation Page

↓

Timeline

↓

Generated Fix

↓

Report

---

# INVESTIGATION PAGE

Header

↓

Overview

↓

Timeline

↓

Agent Status

↓

DataHub Context

↓

Generated Fix

↓

Recommendations

↓

Report

Everything on one page.

---

# DESIGN PRINCIPLES

Modern

Minimal

Enterprise

Dark Theme

Professional

Responsive

Fast

Accessible

No clutter.

---

# ENGINEERING PRINCIPLES

Dependency Injection

Single Responsibility

Open Closed Principle

Typed Models

Modular Services

No Circular Dependencies

Small Files

Readable Code

---

# EXTENSIBILITY

Future plugins

Security Agent

Cloud Agent

DevOps Agent

Monitoring Agent

Knowledge Agent

Authentication

Slack

Teams

Jira

Everything must plug into Investigation Manager.

---

# IMPLEMENTATION RULES

Never skip layers.

Never call DataHub directly from routes.

Never call LLM directly from UI.

Never place business logic inside React components.

Never place business logic inside FastAPI routes.

Never bypass Investigation Manager.

---

# FINAL ARCHITECTURE GOAL

A software engineer should be able to open the repository for the first time and immediately understand:

- where every feature belongs,
- where every responsibility lives,
- how data flows,
- how investigations are executed,
- how agents collaborate,
- how DataHub is integrated.

The architecture must remain understandable, scalable, and production-ready even after the hackathon.

The repository should feel like an enterprise SaaS platform rather than a prototype.