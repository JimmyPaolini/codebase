---
name: tool-execution-model
description: Decide when to use Nx tasks versus direct tooling in this codebase. Use when asked about build, lint, test, typecheck, formatting, Docker, kubectl, Helm, Supabase CLI, Git, or pnpm commands.
license: MIT
---

# Tool Execution Model

This skill clarifies when to use Nx task execution (`nx run`, `nx run-many`, `nx affected`) versus running tools directly.

## When to Use This Skill

Use this skill when a request mentions:

- Running build, lint, test, typecheck, format, or analyze-code tasks
- Docker builds, kubectl, Helm, or Supabase CLI commands
- Questions about why Nx should or should not be used
- CI/CD guidance for task execution

## Nx Task Execution (Workspace Tasks)

Use Nx for tasks that operate on workspace source files:

```bash
# Build, lint, test, typecheck
nx run <project>:build
nx run <project>:lint
nx run <project>:test
nx run <project>:typecheck

# Multi-project
nx run-many --target=lint --all
nx affected --target=test --base=main
```

Why:

- Caching (local/remote)
- Dependency-aware task ordering
- Affected computation for CI
- Consistent task execution across projects

## Direct Tool Invocation (Infrastructure and External Systems)

Use direct tools for operations outside the workspace task graph:

```bash
# Docker
docker build --platform linux/amd64 -t myapp .

# Kubernetes
kubectl get pods
helm upgrade --install myrelease ./chart

# Supabase CLI
supabase start
supabase db diff

# Package manager and Git
pnpm install
git commit -m "..."
```

These operate on external systems (container registry, cluster state, database containers, Git history) and cannot be cached by Nx.

## Nx Wrappers for Tooling

When an Nx target exists, prefer it for consistency:

```bash
nx run caelundas:docker-build
nx run lexico:supabase:start
```

These targets still invoke the underlying CLI, but centralize configuration.

## Decision Flow

```text
Does the task operate on workspace source files?
  ├─ Yes → Use Nx
  └─ No  → Use direct tool
```

## References

- [Tool Execution Model](../../development/tool-execution-model.md)
- [Nx workspace overview](../../../AGENTS.md)
