# Design: skills.sh Integration

**Date**: 2026-07-28  
**Issue**: [#115 — Use skills.sh](https://github.com/JimmyPaolini/codebase/issues/115)  
**Status**: Approved

## Overview

Integrate [skills.sh](https://skills.sh) so that the 52 agent skills in this monorepo are
discoverable, installable, and properly organized via the skills.sh CLI and registry.

```bash
npx skills add JimmyPaolini/codebase
```

## Goals

1. Publish the skills to the skills.sh registry with organized groupings.
2. Consolidate the duplicate skill directories (`.github/skills/` and `.agents/skills/`) to a single source of truth.
3. Document the install command in `AGENTS.md`.
4. Fix any skills not discovered by the skills.sh CLI.

## Non-Goals

- Consuming external skill packages (no `skills-lock.json` needed yet).
- Restructuring skill content or rewriting SKILL.md files.

## Architecture

### Directory Consolidation

**Problem**: Skills currently exist in two identical directories:

- `.github/skills/` — canonical GitHub Copilot path (per `agent-skills.instructions.md`)
- `.agents/skills/` — skills.sh mapping for GitHub Copilot

**Solution**: Keep `.github/skills/` as the physical directory (canonical source). Replace
`.agents/skills/` with a symlink pointing to `../.github/skills`.

```
.github/skills/         ← physical directory (canonical source of truth)
  brainstorming/SKILL.md
  commit-code/SKILL.md
  ...

.agents/skills          → symlink to ../.github/skills
```

Git natively commits symlinks. The skills.sh CLI follows symlinks when discovering SKILL.md
files. GitHub Copilot reads `.github/skills/` directly.

### `skills.sh.json` Registry Configuration

A `skills.sh.json` at the repo root configures how skills appear on the skills.sh registry
page. It uses the `groupings` array from the
[skills.sh.json schema](https://skills.sh/schemas/skills.sh.schema.json).

Skill groupings:

| Group | Skills |
|-------|--------|
| Planning & Design | using-superpowers, brainstorming, writing-plans, writing-skills, executing-plans, dispatching-parallel-agents, subagent-driven-development |
| Git Workflow | backup-code, checkout-branch, commit-code, create-pull-request, create-worktree, finishing-a-development-branch, rename-branch, requesting-code-review, receiving-code-review, resolve-conflicts, restore-code, sign-commits, submit-changes, update-pull-request, using-git-worktrees |
| Code Quality | validate-code, verification-before-completion, systematic-debugging, test-driven-development, testing-mocks, testing-strategy, handle-errors |
| Nx Workspace | nx-generate, nx-import, nx-plugins, nx-run-tasks, nx-workspace, tool-execution-model, monitor-ci, triage-deployment, triage-submission, github-actions |
| Writing Code | write-typescript, write-python, write-react, write-comments |
| Exploration & Research | explore-codebase, explore-internet |
| Documentation | refresh-documentation, learn-lessons, spell-check, upsert-issue |
| Database | query-sql, seed-postgres |
| Package Management | link-workspace-packages |

### AGENTS.md Documentation

Add a `npx skills add JimmyPaolini/codebase` install command in the "Agent Context → Skills"
section of `AGENTS.md` and the root `.github/copilot-instructions.md`.

### Missing Skills Fix

Two skills were not discovered in a `--list` run (50 of 52 found). Investigate and fix their
SKILL.md frontmatter (`name` + `description` required).

## Files Changed

| File | Change |
|------|--------|
| `skills.sh.json` | Create — registry groupings configuration |
| `.agents/skills` | Replace directory with symlink → `../.github/skills` |
| `AGENTS.md` | Add skills.sh install command in "Agent Context" section |
| `.github/copilot-instructions.md` | Add skills.sh install command |
| Broken SKILL.md files (TBD) | Fix frontmatter if needed |

## Success Criteria

- `npx skills add JimmyPaolini/codebase --list` shows all 52 skills.
- `npx skills add JimmyPaolini/codebase` installs skills to the correct agent directory.
- skills.sh registry page at `https://skills.sh/JimmyPaolini/codebase` shows organized groupings.
- No duplicate skill files — single source of truth in `.github/skills/`.
- AGENTS.md documents the install command.
