# skills.sh Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate skills.sh so all 52 skills in this monorepo are discoverable and installable via `npx skills add JimmyPaolini/codebase`.

**Architecture:** Fix 2 SKILL.md YAML parse errors that prevent discovery, add a `skills.sh.json` registry configuration with skill groupings, and document the install command in AGENTS.md.

**Tech Stack:** skills.sh CLI (`npx skills`), YAML frontmatter in SKILL.md files, JSON configuration.

## Global Constraints

- All SKILL.md frontmatter values that contain `: ` (colon + space) must be wrapped in double-quotes — unquoted values cause YAML parse errors in the skills.sh parser.
- `skills.sh.json` must validate against `https://skills.sh/schemas/skills.sh.schema.json`.
- The canonical skill directory is `.agents/skills/` — do NOT modify `.github/skills/` directly (it is a symlink).
- Skill names in `skills.sh.json` must exactly match the `name:` field in each skill's `SKILL.md` frontmatter.
- Commits must follow the monorepo convention: `<type>(<scope>): <gitmoji> <subject>` with a `Co-authored-by: Copilot` trailer.

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.agents/skills/handle-errors/SKILL.md` | Modify | Fix unquoted `description:` YAML value |
| `.agents/skills/testing-strategy/SKILL.md` | Modify | Fix unquoted `description:` YAML value |
| `skills.sh.json` | Create | Registry groupings configuration for skills.sh |
| `AGENTS.md` | Modify | Add install command before skills table-of-contents |

---

## Task 1: Fix YAML Parse Errors in Missing SKILL.md Files

**Files:**
- Modify: `.agents/skills/handle-errors/SKILL.md`
- Modify: `.agents/skills/testing-strategy/SKILL.md`

**Background:**  
The skills.sh CLI uses a YAML parser that rejects unquoted values containing `: ` (colon + space). Both missing skills have descriptions with colons in them, causing a parse error. The fix is to wrap the description values in double quotes.

Verify the error is present before fixing:
```bash
npx skills add . --list 2>&1 1>/dev/null | grep "skip\|warn"
# Expected output contains:
# ⚠ Skipped .../handle-errors/SKILL.md — YAML parse error: Nested mappings are not allowed...
# ⚠ Skipped .../testing-strategy/SKILL.md — YAML parse error: Nested mappings are not allowed...
```

- [ ] **Step 1: Fix handle-errors SKILL.md**

Open `.agents/skills/handle-errors/SKILL.md` and change the frontmatter from:
```yaml
---
name: handle-errors
description: Apply monorepo error handling patterns: Zod validation at boundaries, typed errors, early returns, and retry/backoff. Use when implementing error handling or input validation.
license: MIT
---
```
to:
```yaml
---
name: handle-errors
description: "Apply monorepo error handling patterns: Zod validation at boundaries, typed errors, early returns, and retry/backoff. Use when implementing error handling or input validation."
license: MIT
---
```

- [ ] **Step 2: Fix testing-strategy SKILL.md**

Open `.agents/skills/testing-strategy/SKILL.md` and change the frontmatter from:
```yaml
---
name: testing-strategy
description: Use monorepo testing conventions: unit, integration, end-to-end test naming and Nx commands. Use when adding tests or recommending test coverage.
license: MIT
---
```
to:
```yaml
---
name: testing-strategy
description: "Use monorepo testing conventions: unit, integration, end-to-end test naming and Nx commands. Use when adding tests or recommending test coverage."
license: MIT
---
```

- [ ] **Step 3: Verify both skills are now discovered**

```bash
npx skills add . --list 2>&1 1>/dev/null | grep "skip\|warn"
# Expected: empty output (no warnings)

npx skills add . --list 2>&1 | grep "Found"
# Expected: ◇  Found 52 skills
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/handle-errors/SKILL.md .agents/skills/testing-strategy/SKILL.md
git commit -m "fix(documentation): 🐛 quote SKILL.md descriptions with YAML colons

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Create `skills.sh.json` Registry Configuration

**Files:**
- Create: `skills.sh.json`

**Background:**  
A `skills.sh.json` at the repo root configures the skills.sh registry page at
`https://skills.sh/JimmyPaolini/codebase`. It defines named groups of skills displayed on
that page. The `"notGrouped": "bottom"` setting places any ungrouped skills at the bottom.

Skill names (in the `"skills"` arrays below) must exactly match the `name:` field in each
skill's SKILL.md frontmatter. Verify each name matches before committing.

- [ ] **Step 1: Create `skills.sh.json`**

Create the file at the repo root with this content:

```json
{
  "$schema": "https://skills.sh/schemas/skills.sh.schema.json",
  "notGrouped": "bottom",
  "groupings": [
    {
      "title": "Planning & Design",
      "description": "Skills for clarifying requirements, designing features, writing specs and implementation plans, and orchestrating multi-agent workflows.",
      "skills": [
        "using-superpowers",
        "brainstorming",
        "writing-plans",
        "writing-skills",
        "executing-plans",
        "dispatching-parallel-agents",
        "subagent-driven-development"
      ]
    },
    {
      "title": "Git Workflow",
      "description": "Skills for every step of the git workflow: branching, committing, reviewing, merging, signing, and submitting changes.",
      "skills": [
        "backup-code",
        "checkout-branch",
        "commit-code",
        "create-pull-request",
        "create-worktree",
        "finishing-a-development-branch",
        "rename-branch",
        "requesting-code-review",
        "receiving-code-review",
        "resolve-conflicts",
        "restore-code",
        "sign-commits",
        "submit-changes",
        "update-pull-request",
        "using-git-worktrees"
      ]
    },
    {
      "title": "Code Quality",
      "description": "Skills for validating, testing, debugging, and ensuring code correctness.",
      "skills": [
        "validate-code",
        "verification-before-completion",
        "systematic-debugging",
        "test-driven-development",
        "testing-mocks",
        "testing-strategy",
        "handle-errors"
      ]
    },
    {
      "title": "Nx Workspace",
      "description": "Skills for working in an Nx monorepo: generating code, running tasks, managing plugins, and triaging CI failures.",
      "skills": [
        "nx-generate",
        "nx-import",
        "nx-plugins",
        "nx-run-tasks",
        "nx-workspace",
        "tool-execution-model",
        "monitor-ci",
        "triage-deployment",
        "triage-submission",
        "github-actions"
      ]
    },
    {
      "title": "Writing Code",
      "description": "Language- and framework-specific coding conventions for TypeScript, Python, React, and comments.",
      "skills": [
        "write-typescript",
        "write-python",
        "write-react",
        "write-comments"
      ]
    },
    {
      "title": "Exploration & Research",
      "description": "Skills for gathering context from the codebase and external documentation before planning or implementing.",
      "skills": [
        "explore-codebase",
        "explore-internet"
      ]
    },
    {
      "title": "Documentation",
      "description": "Skills for keeping documentation, skills, and issues accurate and up to date.",
      "skills": [
        "refresh-documentation",
        "learn-lessons",
        "spell-check",
        "upsert-issue"
      ]
    },
    {
      "title": "Database",
      "description": "Skills for querying and seeding local PostgreSQL databases.",
      "skills": [
        "query-sql",
        "seed-postgres"
      ]
    },
    {
      "title": "Package Management",
      "description": "Skills for linking and managing workspace packages in pnpm monorepos.",
      "skills": [
        "link-workspace-packages"
      ]
    }
  ]
}
```

- [ ] **Step 2: Verify all 52 skills are covered**

Run this command to confirm every skill name in the JSON maps to a real skill directory:

```bash
node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('skills.sh.json', 'utf8'));
const allListed = config.groupings.flatMap(g => g.skills);
const localSkills = fs.readdirSync('.agents/skills').filter(n => !n.startsWith('.'));
const missing = localSkills.filter(dir => {
  const md = fs.readFileSync('.agents/skills/' + dir + '/SKILL.md', 'utf8');
  const nameMatch = md.match(/^name:\s*(.+)\$/m);
  if (!nameMatch) return true;
  const name = nameMatch[1].replace(/[\"']/g, '').trim();
  return !allListed.includes(name);
});
if (missing.length) console.log('Missing from skills.sh.json:', missing);
else console.log('All 52 skills are grouped.');
"
# Expected: All 52 skills are grouped.
```

- [ ] **Step 3: Verify skills.sh lists all 52**

```bash
npx skills add . --list 2>&1 | grep "Found"
# Expected: ◇  Found 52 skills
```

- [ ] **Step 4: Commit**

```bash
git add skills.sh.json
git commit -m "feat(documentation): ✨ add skills.sh.json registry configuration

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Document skills.sh Install Command in AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Background:**  
The "Agent Context → Skills" section in `AGENTS.md` currently has the auto-generated skill table-of-contents but no install instructions. Add a line above the `<!-- agent-skills-table-of-contents start -->` marker documenting the `npx skills add JimmyPaolini/codebase` command so developers know how to install skills in other repositories.

The synchronization tool auto-generates the section between the `<!-- agent-skills-table-of-contents start -->` and `<!-- agent-skills-table-of-contents end -->` markers — do NOT modify those markers or the content between them.

- [ ] **Step 1: Add install instructions to AGENTS.md**

Find the "### Skills" heading in `AGENTS.md`. It currently reads:

```markdown
### Skills

Specialized domain knowledge for working on specific systems or patterns:

<!-- agent-skills-table-of-contents start -->
```

Change it to:

```markdown
### Skills

Specialized domain knowledge for working on specific systems or patterns. Install all skills
with the [skills.sh](https://skills.sh) CLI:

```bash
npx skills add JimmyPaolini/codebase
```

<!-- agent-skills-table-of-contents start -->
```

- [ ] **Step 2: Verify the synchronization check still passes**

The synchronization tool validates that the `<!-- agent-skills-table-of-contents start/end -->` block has not drifted. Run it to confirm your change outside the markers doesn't break anything:

```bash
pnpm exec nx run synchronization:start:agent-skills-check
# Expected: ✅ Skills table of contents is in sync
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs(documentation): 📝 add skills.sh install instructions to AGENTS.md

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Final Verification

**Background:**  
End-to-end check: confirm all 52 skills are discoverable locally, the code quality passes, and the design spec is updated to close the loop.

- [ ] **Step 1: Confirm 52 skills found locally**

```bash
npx skills add . --list 2>&1 | grep "Found"
# Expected: ◇  Found 52 skills

npx skills add . --list 2>&1 1>/dev/null | grep "skip\|warn"
# Expected: empty output
```

- [ ] **Step 2: Confirm all 52 remote skills discoverable**

```bash
npx skills add JimmyPaolini/codebase --list 2>&1 | grep "Found"
# Expected: ◇  Found 52 skills
# Note: This clones from GitHub main branch — run after changes are merged to main.
# While on a branch, run the local check above instead.
```

- [ ] **Step 3: Run code quality checks**

```bash
pnpm exec nx affected --target=analyze-code --configuration=write --base=main
# Then verify:
pnpm exec nx affected --target=analyze-code --configuration=check --base=main
# Expected: all checks pass
```

- [ ] **Step 4: Close the GitHub issue**

```bash
gh issue close 115 --comment "skills.sh integration complete: 52 skills discoverable via \`npx skills add JimmyPaolini/codebase\`. Added \`skills.sh.json\` groupings, fixed YAML parse errors in 2 SKILL.md files, and documented install command in AGENTS.md."
```
