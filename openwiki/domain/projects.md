---
type: Domain
title: Monorepo Projects and Workflows
description: Detailed overview of applications, shared packages, tooling, and operational workflows.
tags: [domain, projects, workflows, nx]
---

# Monorepo Projects and Workflows

This document outlines the core applications and packages managed within the monorepo workspace.

## Applications

- **lexico**: TanStack Start web application providing dictionary search and interactive lexicon features. It connects with [lexico-entities](/openwiki/architecture/overview.md) for data access.
- **affirmations**: Python-based LangChain and Ollama affirmation generator utilizing LangGraph ReAct agents.
- **caelundas**: CLI ephemeris calendar generator performing precise astronomical calculations.
- **lexico-ingestion**: NestJS CLI application responsible for ingesting structured Latin dictionary corpuses.

## Packages & Tooling

- **lexico-components**: Shared React UI component library built on shadcn/ui and Tailwind CSS.
- **lexico-entities**: TypeORM entities and GraphQL schema definitions shared across backend services.
- **synchronization**: Synchronization tooling ensuring monorepo configuration consistency across packages.

Related documentation:
- Review the [Architecture Overview](/openwiki/architecture/overview.md) for system dependency graphs.
- Back to [Monorepo Quickstart](/openwiki/quickstart.md).
