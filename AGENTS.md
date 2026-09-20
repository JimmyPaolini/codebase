# Codebase Guidance

## Essential Commands

```bash
# Run tasks via Nx (always prefer this)
nx run <project>:<target>:<configuration>
nx run-many --target=typecheck-code,lint-code,format-code,format-code,guard-code --all
nx affected --target=vitest --base=main

# Install dependencies
pnpm add --filter <project> <package>
pnpm add -w <package>  # Workspace root

# Tools that run directly (not via Nx)
docker build --platform linux/amd64 -t myapp .
kubectl get pods
helm upgrade --install myrelease ./chart
```

## Agent Workflow

Use the [mattpocock/skills](https://github.com/mattpocock/skills) workflow for
non-trivial features, refactors, and bugfixes so the work is clarified,
specified, tracked, and implemented in a consistent way, with the
[obra/superpowers](https://github.com/obra/superpowers) skills supplying the
gates it leaves open — approval before the first line of code, a failing test
before the first line of implementation, and a root cause before the first
fix.

1. Sharpen the request first, running
   [brainstorming](.agents/skills/brainstorming/SKILL.md) and the grilling
   skills together. Brainstorming classifies the request — spike, bounded, or
   architectural — and holds the approval gate: no implementation skill, no
   code, nothing scaffolded until you have said what you intend and heard yes,
   however small the change. Around that gate, run
   [grill-with-docs](.agents/skills/grill-with-docs/SKILL.md) when the work
   needs a domain model or ADRs to come out of the conversation, or
   [grill-me](.agents/skills/grill-me/SKILL.md) for a plain interview. Where
   the two disagree on pacing, [grilling](.agents/skills/grilling/SKILL.md)
   wins: ask the whole frontier as one numbered round carrying a recommended
   answer per question, rather than brainstorming's one question per message.
   Unsure which skill fits? Ask
   [ask-matt](.agents/skills/ask-matt/SKILL.md).
2. Capture the outcome with [to-spec](.agents/skills/to-spec/SKILL.md), then
   split it with [to-tickets](.agents/skills/to-tickets/SKILL.md) when the work
   spans multiple tasks. Reach for
   [wayfinder](.agents/skills/wayfinder/SKILL.md) when the work is larger than
   one agent session can hold. This step is brainstorming's terminal state:
   ignore its hand-off to `writing-plans` and its `docs/superpowers/specs/`
   destination — that skill is not installed here, and a spec and its tickets
   belong where [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md)
   says.
3. Hand the plan across the session boundary with
   [handoff](.agents/skills/handoff/SKILL.md) whenever the building will happen
   in a fresh session, which is the normal case for anything larger than a
   single ticket. The document it writes is the next agent's entire brief, so
   it is held to this repository's rules rather than the skill's defaults — see
   [Handoffs](#handoffs).
4. Move every ticket the work covers — the spec, the parent issue for the pull
   request, and the sub-issue for the commit — to `status:in-progress` before
   the first test, the way
   [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) describes.

   **A spec with more than one ticket is dispatched, not implemented in this
   session.** Hand each parent issue — the whole pull request, not one task
   inside it — to a fresh subagent: independent tickets together, dependent
   ones one at a time down a stack. See
   [Multiple Pull Requests](#multiple-pull-requests) for the dependency-order
   mechanics and why dispatching this way, rather than implementing each
   ticket here in turn, is what keeps this session's own context usable for
   the run's length. This is
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)'s
   core principle — a fresh subagent per unit of work — applied one level up,
   at ticket granularity instead of task granularity. Brief each dispatched
   subagent with its ticket, the spec, and everything below through step 7:
   it owns that ticket's whole lap and reports back only its branch, pull
   request URL, and status. Only when the spec holds exactly one ticket does
   this session run the process below directly rather than dispatching it.

   Build with [implement](.agents/skills/implement/SKILL.md), which drives
   red-green-refactor through two TDD skills used in tandem, both read before
   the first test.
   [test-driven-development](.agents/skills/test-driven-development/SKILL.md)
   is the discipline — no production code without a failing test, and every
   test watched failing for the right reason before the code that passes it is
   written. [tdd](.agents/skills/tdd/SKILL.md) is what makes those tests worth
   keeping — seams confirmed with the user before a test is written, behavior
   asserted through public interfaces, and the tautological,
   implementation-coupled, and horizontally-sliced anti-patterns named. Where
   they disagree, `test-driven-development` owns the loop's strictness and
   `tdd` owns refactoring: it belongs to step 5's review rather than to the
   cycle. Its `npm test` invocations are `nx run <project>:vitest:<kind>` here
   — see [Testing & Coverage](#testing--coverage). If the one ticket in front of you — this
   session's own, or the one a dispatched subagent owns — still splits into
   several independent tasks, orchestrate those with
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
   again, one level down — one fresh subagent per task — and use
   dispatching-parallel-agents when the tasks are genuinely independent. Debug
   regressions with
   [systematic-debugging](.agents/skills/systematic-debugging/SKILL.md) and
   [diagnosing-bugs](.agents/skills/diagnosing-bugs/SKILL.md) in tandem, split
   the way the TDD pair is: systematic-debugging is the gate — no fix proposed
   until its root-cause phase is finished, however obvious the fix looks — and
   diagnosing-bugs is the method that gets you a root cause.

5. Ask for the review with
   [requesting-code-review](.agents/skills/requesting-code-review/SKILL.md) —
   a fresh subagent handed the base and head commits and what the work was
   meant to do, never this session's history — review with
   [code-review](.agents/skills/code-review/SKILL.md), and apply incoming
   feedback through
   [receiving-code-review](.agents/skills/receiving-code-review/SKILL.md)
   rather than agreeing on sight.
6. Finish with [validate-code](.agents/skills/validate-code/SKILL.md), gated by
   [verification-before-completion](.agents/skills/verification-before-completion/SKILL.md):
   never claim done without the command output that proves it.
7. Integrate with
   [finishing-a-development-branch](.agents/skills/finishing-a-development-branch/SKILL.md),
   which supplies the decision — merge, open a pull request, or leave the
   branch — and nothing else: this repository's own skills own the mechanics,
   so run [submit-changes](.agents/skills/submit-changes/SKILL.md) and the
   [commit-code](.agents/skills/commit-code/SKILL.md) and
   [create-pull-request](.agents/skills/create-pull-request/SKILL.md) skills it
   drives rather than that skill's git commands, and read its `npm test` step
   as `nx affected --target=vitest --base=main`. Decline its worktree cleanup
   when the harness created the worktree: the session is running inside it.

Steps 4 through 7 are one ticket's lap, not the whole race — run directly by
this session for a single-ticket spec, or run inside each dispatched
subagent for a multi-ticket one. Either way the session's job does not end
until the spec has no ticket left: for a single ticket, a pull request
opened sends you back to step 4 with the next one; for a multi-ticket spec,
a subagent's report sends you back to step 4 to dispatch the next
independent batch or the next stack link. See
[Multiple Pull Requests](#multiple-pull-requests).

The codebase-native skills still own this repository's mechanics — branch
names, commits, pull requests, Nx targets, and validation. Prefer them over any
general-purpose equivalent, and see the [Skills](#skills) list for the full set.

### Multiple Pull Requests

**A spec is done when every ticket under it is merged or open as a pull
request — never when the first one is.** The usual failure is a session that
builds the first ticket well, opens its pull request, reports the work complete,
and leaves the rest of the spec with nobody holding it. One ticket is one pull
request; the whole ticket set is the assignment.

Read the parent issues and their sub-issues before the first test and write the
dependency order down. That order, rather than the issue numbering, decides the
shape of the run:

- **Independent tickets run in parallel** — each in its own worktree cut from
  `main` via [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md),
  dispatched with
  [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md).
- **Dependent tickets stack** — each branched off the ticket it needs rather
  than off `main` and submitted with
  [gh-stack](.agents/skills/gh-stack/SKILL.md), so every pull request still
  reviews as its own diff. Typecheck the upper layers after rebasing a lower
  one: a replay can be conflict-free and still leave them broken. Dispatch the
  next link in the chain once the ticket beneath it has an open pull request —
  not once it merges, per the rule below.

Each dispatched ticket subagent is self-contained: its own worktree, branch,
implementation, tests, validation, and pull request, all inside that
subagent's context. This orchestrating session never reads the files a
dispatched ticket touches — only the report the subagent returns. That
separation, not just the parallelism, is why tickets are dispatched rather
than implemented here one after another: it is what keeps this session able
to re-plan the remaining tickets, answer a subagent's mid-task question, or
reorder the stack without running out of room.

Two things keep the run from stalling. **An open pull request is a finished
ticket**, so do not idle waiting for a review or a merge before starting the
next one — the only thing that forces an order is a ticket whose branch
another must sit on, which is what the stack is for. And **a blocked ticket
does not end the run**, so build every ticket that is not blocked, then say
plainly which were left and why. Quietly narrowing a spec to its first ticket
is the failure this section exists to prevent.

Close by reporting the set — one row per ticket with its branch, its pull
request, and its status.

### Handoffs

A planning session ends where an implementation session begins, and whatever the
handoff document does not say, the next agent invents. It is also the only record
that step 1's approval gate was passed, which is what makes an uninterrupted
implementation run legitimate. Five repository rules override
[handoff](.agents/skills/handoff/SKILL.md)'s defaults:

- **Post it as a comment on the spec issue**, not in the operating system's
  temporary directory the skill defaults to — the next session cannot be pointed
  at that, and the next reboot may empty it. On the issue, the next session gets
  the plan, the tickets, and the brief from one link.
- **Prescribe the workflow skills, do not suggest them.** A list of skills an
  agent "may find useful" is a list an agent skips. Write a numbered "How to run
  this" section naming each skill in call order:
  [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) for each
  ticket's own worktree, then
  [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
  at ticket granularity — a fresh subagent per parent issue, dispatched
  together with
  [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)
  for the tickets that are independent, or one at a time down a
  [gh-stack](.agents/skills/gh-stack/SKILL.md) chain for the ones that are
  not — and, inside each dispatched ticket,
  [implement](.agents/skills/implement/SKILL.md) and
  [tdd](.agents/skills/tdd/SKILL.md), with subagent-driven-development invoked
  again at task granularity if that ticket itself splits into several tasks,
  then steps 5–7 above. Say plainly that this session is the orchestrator: it
  dispatches tickets and reads their reports back, and implements a ticket in
  its own context only when the spec holds exactly one.
- **Answer the two questions those skills otherwise stop and ask.**
  `subagent-driven-development` keys its workspace and ledger off a **plan file
  path**, so say to export the issue's plan to a local scratch file first. And
  `tdd` will not write a test at an unconfirmed seam, so point it at the spec's
  Testing Decisions and say to treat those as the confirmation — otherwise a
  session told to run uninterrupted stops before its first test.
- **Say how the work is cut into pull requests, and that every one of them is
  this session's job.** One ticket per pull request, and name each branch or at
  least the type and scope every branch must take — a squashed title is all
  semantic-release ever sees, so the ticket split decides
  [Release Significance](CONTRIBUTING.md#release-significance). Then give the dependency order:
  which tickets are independent and run in parallel off `main`, and which stack
  with [gh-stack](.agents/skills/gh-stack/SKILL.md) because one needs another's
  branch underneath it. "This session's job" means dispatching and
  orchestrating every one of them — see
  [Multiple Pull Requests](#multiple-pull-requests) for why that, not
  implementing each ticket directly, is the rule. A brief that lists tickets
  without stating that the session owns **all** of them is a brief that
  returns one pull request and nothing else, so write the exit condition
  out — every ticket merged or open — and point at that same section.
- **Assign a model and thinking level per role.** Orchestrating a ticket set,
  implementing one ticket, and reviewing a diff are different problems and should
  not draw the same reasoning budget. No table of model names lives here on
  purpose — it would be stale within a release or two.

## Projects

Every project lives in `applications/`, `packages/`, or `tools/`. Read the
current set rather than a list kept here — a hand-maintained list drifts, and
nothing would gate this one:

```bash
nx show projects
```

[`README.md`](README.md) carries the annotated table, one row per project, and
`nx run codebase:check-readme-projects` fails when it misses one.

**A commit scope is not a project.** The scope vocabulary is the closed set in
[Conventional Naming](CONTRIBUTING.md#commit-guidelines), and it collapses each toolchain to
a single name: every `callidescope-*`, `codependix-*`, `codometer-*`, and
`conformetry-*` package commits under `callidescope`, `codependix`, `codometer`,
and `conformetry` respectively. Deriving a scope from a directory name is how an
invented scope fails validation.

## Work Scope

- When coding or refactoring, focus on one project at a time, or for sufficiently large requests only one module/folder at a time.
- If a request spans multiple projects or scopes, complete the first project end-to-end before starting the next one.
- If the work is truly independent across projects, split it into separate subagents or separate passes so each agent stays project-scoped.
- Avoid mixing unrelated project changes in one context unless the task is explicitly orchestrating them.
- This also keeps a pull request's commits at one release significance: see [Release Significance](CONTRIBUTING.md#release-significance) for why a branch that stays within one project or module rarely accumulates a commit more significant than the type its title was going to use.

## Code Quality & Conventions

**Every coding agent MUST run the [validate-code skill](.agents/skills/validate-code/SKILL.md) before declaring any implementation task complete.** This is non-negotiable.

```bash
# Auto-fix all format, lint, and unused-code issues
pnpm exec nx affected --target=typecheck-code,lint-code,format-code,format-code,guard-code --configuration=write --base=main

# Verify no issues remain — all checks must pass
pnpm exec nx affected --target=typecheck-code,lint-code,format-code,format-code,guard-code --configuration=check --base=main
```

For new/untracked files not yet picked up by `nx affected`:

```bash
pnpm exec nx run <project>:typecheck-code,lint-code,format-code,format-code,guard-code --configuration=write
pnpm exec nx run <project>:typecheck-code,lint-code,format-code,format-code,guard-code --configuration=check
```

**Do not commit until both commands pass cleanly.** If they fail, use the [triage-integration skill](.agents/skills/triage-integration/SKILL.md) to diagnose and fix the errors.

**TypeScript type coverage rule:** For any touched TypeScript project that defines a `type-coverage` target, run both `typecheck` and `type-coverage` before declaring implementation complete. Passing `typecheck` alone is not sufficient when `type-coverage` is available.

**Never silence errors with disable comments or configuration changes.** Do not use `// eslint-disable`, `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `nocheck`, or similar suppression comments to work around lint or type errors. Do not loosen TypeScript `compilerOptions` (e.g. enabling `skipLibCheck`, disabling `strict` flags) or add ESLint `ignores`/`rules` overrides to suppress specific errors. Instead, triage the root cause and fix the code. Suppression is only permitted when the user explicitly requests it.

See the [validate-code skill](.agents/skills/validate-code/SKILL.md) for the full validation workflow and per-tool fix guidance.

### IC-Suite

Four in-house toolchains measure this workspace and gate what they measure:

- **callidescope**: Call-stack depth, breadth
- **codependix**: Dependency-graph boundary rules
- **codometer**: Sizes, counts, comment-block length
- **conformetry**: Generated code against its template

Use the respective agent skills (e.g., `codometer-measure`, `callidescope-triage`) to interact with these toolchains. Scaffold with `conformetry-generate` instead of hand-crafting. Never manually edit limits, bypass rules, or hand-edit generated output to make a check pass.

### Project Structure & Boundaries

- **Strict folder structure** is enforced by ESLint. Always use `conformetry-generate` (e.g., `nx g conformetry:<generator>`) to scaffold new files and modules to ensure correct placement. See `configuration/codebase-structure.json` for the raw rules.
- **Respect Nx module boundaries** defined in `eslint.config.ts`. Applications cannot import applications, and packages cannot import applications. Use the `codependix-navigate` skill to check dependency rules.

### Testing & Coverage

Tests must accompany code. Run tests via `nx run <project>:vitest:<unit|integration>`. Coverage and size gates are strictly enforced; do not lower thresholds to pass CI. Consult the [testing-strategy skill](.agents/skills/testing-strategy/SKILL.md) for testing requirements and patterns.

### Language Conventions & Size Limits

For naming conventions, abbreviations, formatting, and language-specific rules, invoke the `write-typescript` or `write-python` skills. Strict size limits apply (e.g., max 512 lines per file, 128 words per comment block). Split files and refactor rather than ignoring limits.

## Git Workflow

[`CONTRIBUTING.md`](CONTRIBUTING.md) contains the full narrative for worktrees, hooks, branch naming, commits, releases, and the pull request process. **Do not execute raw Git commands for these workflows.** Instead, rely entirely on the provided skills which inherently enforce this repository's conventions:

- **Worktrees & Branches**: Use [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) and [checkout-branch](.agents/skills/checkout-branch/SKILL.md).
- **Commits**: Use [commit-code](.agents/skills/commit-code/SKILL.md) to generate Conventional Commits with Gitmoji.
- **Pull Requests**: Use [create-pull-request](.agents/skills/create-pull-request/SKILL.md) and [submit-changes](.agents/skills/submit-changes/SKILL.md).
- **Stacking/Splitting Work**: Use [gh-stack](.agents/skills/gh-stack/SKILL.md).

**Agent-Specific Rules:**

- **Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.
- **Do not run signing-check scripts manually**; Husky already runs these.
- **Never run `git submodule update --init` for `applications/JimmyPaolini`.** That submodule is deliberately uninitialized everywhere. If `pnpm install` rewrites its `pnpm-lock.yaml` entry, **revert the lockfile** rather than reconciling it.
- **Release Significance:** The PR title determines the semantic-release bump. Ensure the PR title's type is at least as significant as the highest commit on the branch.
- **Conventional Naming:** If you need to view the current valid Types and Scopes without using a skill, read `configuration/conventional.config.cjs`.

## Agent Context

`.agents/skills/` and this file are the single sources of truth.
Use the [symlink-files](.agents/skills/symlink-files/SKILL.md) skill to understand how other entry points mirror them.

### Session Hooks

Startup scripts run at the start of every agent session and inject their failure as additional context. **Fix what they report before writing any code.** Use the [agent-session-hooks](.agents/skills/agent-session-hooks/SKILL.md) skill to understand how they work or to add a new check.

### Instructions

Guidelines for creating custom instruction files, skills, agents, and prompts for GitHub Copilot. See [`.github/instructions/`](.github/instructions) for actual implementations:

- `agent-skills.instructions.md`: Structure and format for skill files
- `agents.instructions.md`: Building specialized agent workflows
- `instructions.instructions.md`: Writing context-specific guidance
- `prompt.instructions.md`: Designing reusable prompt templates

### Skills

Specialized domain knowledge for working on specific systems or patterns, in
[`.agents/skills/`](.agents/skills). Every agent is given the installed skills
directly, so they are not listed here — reading the directory is what tells you
which ones exist right now, including the ones installed from other
repositories.

Writing or editing one — in `.agents/skills/`, or in the four `*-agents`
packages this repository publishes — is its own task with its own two skills:
[writing-skills](.agents/skills/writing-skills/SKILL.md) for how a skill is
built and verified before it ships, and
[writing-for-agents](.agents/skills/writing-for-agents/SKILL.md) for the prose
inside it.

**Every skill is committed**, vendored ones included. Use the [install-skills](.agents/skills/install-skills/SKILL.md) skill to understand how skills are updated (`skills update`), installed, and excluded from repository tooling.

### Agent Skills Configuration

The [mattpocock/skills](https://github.com/mattpocock/skills) engineering skills
read their per-repository configuration from `docs/agents/`. Edit these files
directly; re-run `/setup-matt-pocock-skills` only to switch issue trackers or
start over.

| Concern       | Setting                                                                                                                   | Reference                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Issue tracker | GitHub Issues in `JimmyPaolini/codebase`, via the `gh` CLI — a spec, then one issue per pull request, then one per commit | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage labels | The five canonical roles mapped onto this repository's `status:` label family                                             | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Domain docs   | Single-context — one root `CONTEXT.md` plus root `docs/adr/`                                                              | [`docs/agents/domain.md`](docs/agents/domain.md)               |

`CONTEXT.md` and `docs/adr/` are both populated now.
[domain-modeling](.agents/skills/domain-modeling/SKILL.md) grows them lazily, as
terms and decisions actually get resolved — so add to them when a decision
lands, rather than scaffolding ahead of the work.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- Hand-written, and deliberately outside the Nx-managed block above:
     anything between those markers is regenerated and would be lost. -->

- **This workspace has no `test` target.** The `nx-*` skills are installed from
  [nrwl/nx](https://github.com/nrwl/nx) and their examples use the conventional
  `nx run-many -t test`, which fails here. Read `test` as `vitest` — or
  `pytest` for a `language:python` project — and see
  [Testing & Coverage](#testing--coverage) for the real target names.

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
