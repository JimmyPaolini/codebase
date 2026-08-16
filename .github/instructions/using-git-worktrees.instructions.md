---
description: "Create or attach git worktrees with this repository's validated branch naming convention. Use when asked to create a worktree, derive a branch name, choose a worktree path, or avoid raw git worktree add commands."
applyTo: "AGENTS.md,.github/copilot-instructions.md,.agents/skills/using-git-worktrees/**"
---

# Git Worktree Workflow

Use the [using-git-worktrees](../../.agents/skills/using-git-worktrees/SKILL.md)
skill to create or verify an isolated workspace. It prefers a native worktree
tool when one is available and falls back to `git worktree` otherwise — either
way, avoid ad hoc `git worktree add` invocations.

Two repository rules override the skill's generic defaults:

- **Branch names are validated.** Use the `<type>/<scope>-<description>` format
  defined by `configuration/conventional.config.cjs`. The authoritative type and
  scope tables live in the Conventional Naming section of `AGENTS.md`, which the
  `conventional-config` synchronization target keeps in sync — read them there
  rather than from a copy. Derive a compliant name with the
  [checkout-branch](../../.agents/skills/checkout-branch/SKILL.md) skill when the
  user gives only an intent.
- **Validate before creating anything:** run
  `pnpm exec validate-branch-name -t "<branch-name>"`. The pre-push hook and the
  Validate Conventions workflow both reject a non-compliant branch.

If the branch already exists locally, attach a worktree to it instead of
creating a replacement branch.
