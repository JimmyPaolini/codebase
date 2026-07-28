---
type: Reference
title: Monorepo Quickstart
description: Quickstart entrypoint for OpenWiki knowledge base covering repository structure, projects, and local development.
tags: [quickstart, overview, monorepo]
---

# Monorepo Quickstart

Welcome to the OpenWiki knowledge base for the modern TypeScript monorepo managed with Nx.

## Overview

This monorepo contains a comprehensive set of TypeScript and Python packages and applications, including:
- **[affirmations](applications/affirmations)** - Python LangChain + Ollama affirmation generator
- **[caelundas](applications/caelundas)** - CLI ephemeris calendar generator
- **[lexico](applications/lexico)** - TanStack Start dictionary web application
- **[lexico-components](packages/lexico-components)** - Shared React UI components
- **[lexico-entities](packages/lexico-entities)** - TypeORM entities and GraphQL types
- **[lexico-ingestion](applications/lexico-ingestion)** - NestJS CLI app for dictionary ingestion
- **[synchronization](tools/synchronization)** - Monorepo configuration synchronization tool

## Architecture & Workflows

For details on the system design and workflows, refer to:
- [Architecture Overview](/openwiki/architecture/overview.md)
- [Monorepo Projects & Workflows](/openwiki/domain/projects.md)

## Backlog
- Add comprehensive API service mapping.
