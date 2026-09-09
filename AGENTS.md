# Codebase Guidance

## Essential Commands

```bash
# Run tasks via Nx (always prefer this)
nx run <project>:<target>:<configuration>
nx run-many --target=lint-codebase --all
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
   Then build with [implement](.agents/skills/implement/SKILL.md), which drives
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
   — see [Testing](#testing). For a multi-task ticket set, orchestrate with
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
   — one fresh subagent per task — and use
   [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)
   when tasks are genuinely independent. Debug regressions with
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

The codebase-native skills still own this repository's mechanics — branch
names, commits, pull requests, Nx targets, and validation. Prefer them over any
general-purpose equivalent, and see the [Skills](#skills) list for the full set.

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
  [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md),
  [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md),
  then [implement](.agents/skills/implement/SKILL.md) and
  [tdd](.agents/skills/tdd/SKILL.md) inside each dispatched task, then steps 5–7
  above.
- **Answer the two questions those skills otherwise stop and ask.**
  `subagent-driven-development` keys its workspace and ledger off a **plan file
  path**, so say to export the issue's plan to a local scratch file first. And
  `tdd` will not write a test at an unconfirmed seam, so point it at the spec's
  Testing Decisions and say to treat those as the confirmation — otherwise a
  session told to run uninterrupted stops before its first test.
- **Say how the work is cut into pull requests.** One ticket per pull request,
  stacked with [gh-stack](.agents/skills/gh-stack/SKILL.md), and name each
  branch or at least the type and scope every branch must take — a squashed title
  is all semantic-release ever sees, so the ticket split decides
  [Release Significance](#release-significance).
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
[Conventional Naming](#conventional-naming), and it collapses each toolchain to
a single name: every `callidescope-*`, `codependix-*`, `codometer-*`, and
`conformetry-*` package commits under `callidescope`, `codependix`, `codometer`,
and `conformetry` respectively. Deriving a scope from a directory name is how an
invented scope fails validation.

## Work Scope

- When coding or refactoring, focus on one project at a time, or for sufficiently large requests only one module/folder at a time.
- If a request spans multiple projects or scopes, complete the first project end-to-end before starting the next one.
- If the work is truly independent across projects, split it into separate subagents or separate passes so each agent stays project-scoped.
- Avoid mixing unrelated project changes in one context unless the task is explicitly orchestrating them.
- This also keeps a pull request's commits at one release significance: see [Release Significance](#release-significance) for why a branch that stays within one project or module rarely accumulates a commit more significant than the type its title was going to use.

## Code Quality

**Every coding agent MUST run the [validate-code skill](.agents/skills/validate-code/SKILL.md) before declaring any implementation task complete.** This is non-negotiable.

```bash
# Auto-fix all format, lint, and unused-code issues
pnpm exec nx affected --target=lint-codebase --configuration=write --base=main

# Verify no issues remain — all checks must pass
pnpm exec nx affected --target=lint-codebase --configuration=check --base=main
```

For new/untracked files not yet picked up by `nx affected`:

```bash
pnpm exec nx run <project>:lint-codebase --configuration=write
pnpm exec nx run <project>:lint-codebase --configuration=check
```

**Do not commit until both commands pass cleanly.** If they fail, use the [triage-submission skill](.agents/skills/triage-submission/SKILL.md) to diagnose and fix the errors.

**TypeScript type coverage rule:** For any touched TypeScript project that defines a `type-coverage` target, run both `typecheck` and `type-coverage` before declaring implementation complete. Passing `typecheck` alone is not sufficient when `type-coverage` is available.

**Never silence errors with disable comments or configuration changes.** Do not use `// eslint-disable`, `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `nocheck`, or similar suppression comments to work around lint or type errors. Do not loosen TypeScript `compilerOptions` (e.g. enabling `skipLibCheck`, disabling `strict` flags) or add ESLint `ignores`/`rules` overrides to suppress specific errors. Instead, triage the root cause and fix the code. Suppression is only permitted when the user explicitly requests it.

See the [validate-code skill](.agents/skills/validate-code/SKILL.md) for the full validation workflow and per-tool fix guidance.

### Task Cache Inputs

`nx.json`'s `shared-globals` reaches almost every lint target, directly or
through `default`, so whatever it names is an input to nearly every task in the
workspace. It holds `configuration/tsconfig.json` and nothing else, and that is
load-bearing rather than incidental.

**Never add a high-churn file to `shared-globals`.** It once named
`pnpm-lock.yaml`, `nx.json`, and `.github/workflows/*.yml`, and because a pull
request is built from the merge commit, every branch inherited their churn — so
every task in the workspace re-hashed on essentially every run and 🧑‍💻 Lint
Codebase never recorded a single cache hit. Nothing failed; the work was simply
repeated. **Nothing checks for this** — a run whose cache never hits is still a
green run, so the only signal is the duration, and re-adding one glob here
silently undoes the whole arrangement. See
[ADR 0007](docs/adr/0007-state-the-real-dependency-in-task-cache-inputs.md).

State the real dependency instead:

- **Tool versions** belong in a per-target `{"externalDependencies": [...]}`
  entry, which hashes the resolved versions of exactly those packages. This is
  what `typecheck` has always done with `typescript`; every lint target now
  names its own tools the same way. A tool added to a target's command must be
  added there too, or an upgrade of it will replay a stale cached result.
- **Python tools** need no entry: their targets already declare
  `{workspaceRoot}/pyproject.toml` and `{workspaceRoot}/uv.lock`.
- **Whole-lockfile sensitivity**, where a target genuinely depends on every
  dependency rather than a named few, is the `dependency-versions` namedInput.
  `build` uses it, because a bundle really does change when any dependency
  does. No lint target should need it.

**A task's own artifact must never be one of its inputs**, or it rewrites the
hash it was just cached under and can never hit its own cache. `.eslintcache/`
is excluded from `default` and from the `eslint` inputs for that reason, and a
project's `codometer-report.json` is subtracted from its own.

### Quality Tools

| Tool            | Description                                           | Config                                                          | Docs                                                             |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `oxfmt`         | Formats TS/JS/JSON/MD files                           | `configuration/oxfmt.config.ts`                                 | [docs](https://oxc.rs/docs/guide/usage/formatter.html)           |
| `sqlfluff`      | Formats and lints SQL files                           | root `pyproject.toml`                                           | [docs](https://docs.sqlfluff.com/)                               |
| `prettier`      | Supplementary formatter for manual or non-default use | `configuration/prettier.config.ts`                              | [docs](https://prettier.io/docs/)                                |
| `eslint`        | Lints TS/JS and markdown with workspace rules         | project `eslint.config.ts`                                      | [docs](https://eslint.org/docs/latest/)                          |
| `oxlint`        | Fast TS/JS linting for workspace files                | `configuration/oxlint.config.ts`                                | [docs](https://oxc.rs/docs/guide/usage/linter.html)              |
| `ruff`          | Formats and lints Python files                        | root `pyproject.toml`                                           | [docs](https://docs.astral.sh/ruff/)                             |
| `tsc`           | Type-checks TypeScript                                | project `tsconfig.json`                                         | [docs](https://www.typescriptlang.org/docs/)                     |
| `type-coverage` | Enforces TypeScript type-coverage gates               | root `tsconfig.json`                                            | [docs](https://github.com/plantain-00/type-coverage)             |
| `pyright`       | Performs static Python type checking                  | root `pyproject.toml`                                           | [docs](https://github.com/microsoft/pyright)                     |
| `ty`            | Performs additional Python type checking              | root `pyproject.toml`                                           | [docs](https://docs.astral.sh/ty/)                               |
| `knip`          | Finds unused TS/JS files, exports, and dependencies   | `configuration/knip.config.ts`                                  | [docs](https://knip.dev/)                                        |
| `vulture`       | Finds unused Python code                              | `configuration/vulture_whitelist.py`                            | [docs](https://github.com/jendrikseipp/vulture)                  |
| `fallow`        | Analyzes dead code, duplication, and code health      | `configuration/fallow.config.jsonc`                             | [docs](https://docs.fallow.tools/)                               |
| `jscpd`         | Detects duplicated code and copy-paste patterns       | `configuration/jscpd.config.json`                               | [docs](https://jscpd.dev/)                                       |
| `callidescope`  | Traces call stacks and flags ones that are too deep   | `configuration/callidescope.config.ts`, plus each project's own | [docs](packages/callidescope-cli/README.md), [skills](#ic-suite) |
| `codependix`    | Exports dependency graphs and gates rules over them   | `configuration/codependix.config.ts`                            | [docs](packages/codependix-cli/README.md), [skills](#ic-suite)   |
| `cspell`        | Checks spelling across code and documentation         | `configuration/cspell.config.yaml`                              | [docs](https://cspell.org/)                                      |
| `markdownlint`  | Lints markdown files                                  | `configuration/.markdownlint-cli2.jsonc`                        | [docs](https://github.com/DavidAnson/markdownlint-cli2)          |
| `yamllint`      | Lints YAML files                                      | `configuration/yamllint.yaml`                                   | [docs](https://yamllint.readthedocs.io/)                         |

### IC-Suite

Four in-house toolchains measure this workspace and gate what they measure.
Each ships three or four agent skills, and **those skills are the reference** —
flags, configuration fields, and what to do about every finding. What follows is
only what is true of this workspace in particular.

| Toolchain | Gates | Branch gate | Skills |
| --------- | ----- | ----------- | ------ |
| [callidescope](packages/callidescope-cli/README.md) | Call-stack depth, breadth | each project's `gate` | [trace](packages/callidescope-agents/skills/callidescope-trace/SKILL.md) · [configure](packages/callidescope-agents/skills/callidescope-configure/SKILL.md) · [triage](packages/callidescope-agents/skills/callidescope-triage/SKILL.md) |
| [codependix](packages/codependix-cli/README.md) | Dependency-graph boundary rules | `codebase:codependix:check` | [export](packages/codependix-agents/skills/codependix-export/SKILL.md) · [configure](packages/codependix-agents/skills/codependix-configure/SKILL.md) · [triage](packages/codependix-agents/skills/codependix-triage/SKILL.md) · [navigate](packages/codependix-agents/skills/codependix-navigate/SKILL.md) |
| [codometer](packages/codometer-cli/README.md) | Sizes, counts, comment-block length | `codebase:codometer` and each project's `codometer` | [measure](packages/codometer-agents/skills/codometer-measure/SKILL.md) · [configure](packages/codometer-agents/skills/codometer-configure/SKILL.md) · [triage](packages/codometer-agents/skills/codometer-triage/SKILL.md) |
| conformetry | Generated code against its template | `conformetry-validate` | [generate](.agents/skills/conformetry-generate/SKILL.md) · [configure](.agents/skills/conformetry-configure/SKILL.md) · [validate](.agents/skills/conformetry-validate/SKILL.md) |

- **Generate rather than hand-craft.** `nx g conformetry:<generator>` scaffolds a
  project, module, or component; code hand-written in a shape a template already
  describes starts life failing conformance. `conformetry templates` lists the
  generators, and [`README.md`](README.md) carries the same table. No project is
  called `conformetry` — the name means the generator namespace, whose plugin is
  emitted into the gitignored `.conformetry/` on `pnpm install`; run
  `pnpm install` again if Nx reports it missing.
- **Callidescope limits are per project**, inherited per limit from
  `configuration/callidescope.config.ts`, so a project's own file writes only
  what it overrides. Read them as a set rather than looking for a table —
  `nx run callidescope-cli:start -- limits --config configuration/callidescope.config.ts`.
  `affirmations`, the workspace root, `callidescope-examples`, the four skill
  packages, and the codependix/codometer/conformetry examples packages carry no
  gate, and each `project.json` target description says why.
- **Comment blocks are capped at 128 words**, declared in
  [`configuration/codometer.config.ts`](configuration/codometer.config.ts) and
  reaching every language codometer measures comments in. Shell is looser at
  256, because `scripts/shell/` holds command references whose whole body is one
  block documenting flags.
- **`codependix --check boundaries` complements `@nx/enforce-module-boundaries`
  rather than replacing it** — it states the rules an import-statement linter
  structurally cannot, and ESLint reports at the import site with a line number,
  which a graph-level report cannot match. It is deliberately not in
  `configuration/lint-staged.config.ts`: it builds a `ts.Program` per project and
  takes about twenty seconds, which is not a hook anybody keeps.
- **Never raise a limit, loosen a rule, or hand-edit generated output to make a
  check pass.** Each toolchain's `triage` skill is the entry point, and every
  limit here was set from a measured run rather than chosen.
- **The skills are authored in the `*-agents` packages** and installed back from
  `skills-lock.json`, so what this repository loads is what another workspace
  gets. Edit the package, never the installed copy under `.agents/skills/` —
  `skills update` overwrites it.
- **Each toolchain's examples package demonstrates its behavior**, and its
  `AGENTS.md` maps "the tool said X" to the example reproducing X in about a
  second. **Several examples are deliberately broken, and "fixing" one deletes
  the only place that behavior is demonstrated — do not repair them.**
  [`docs/examples-package-standard.md`](docs/examples-package-standard.md) holds
  the shape all four share.

## Git Workflow

[`CONTRIBUTING.md`](CONTRIBUTING.md) is the full narrative — worktrees, hooks,
branch naming, commits, releases, and the pull request process. What follows is
what an agent needs at the moment of acting, plus the rules that fail a pull
request.

**Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.
**Do not run signing-check scripts manually**; Husky already runs
`check-commit-signing-configuration.sh` in pre-commit and
`check-push-commit-signatures.sh` in pre-push.

### Git Worktrees

Use [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md), which
prefers this harness's native worktree tool over raw `git worktree add`. Three
repository rules override its defaults:

- **The branch name is not free-form** — derive one from the tables below and
  validate it with `pnpm exec validate-branch-name -t "<branch-name>"` **before
  creating anything**, or the pre-push hook wastes the work.
  [checkout-branch](.agents/skills/checkout-branch/SKILL.md) derives one.
- **If the branch already exists locally, attach a worktree to it** rather than
  creating a second branch.
- **Never run `git submodule update --init` for `applications/JimmyPaolini`.**
  That submodule is deliberately uninitialized everywhere — locally and in CI —
  so a `-` prefix from `git submodule status` is expected, not broken. If
  `pnpm install` or `lint-codebase --write` rewrites its `pnpm-lock.yaml` entry,
  **revert the lockfile** rather than reconciling it: it is the known
  worktree-only spurious diff.

### Branch Names

`<type>/<scope>-<description>` — all three required, type and scope exact values
from [Conventional Naming](#conventional-naming), description kebab-case
(`[a-z0-9-]+`). An invented scope fails validation even when the name reads well.

```bash
pnpm exec validate-branch-name -t "feat/lexico-user-auth"
```

Only `main` is exempt. Automated prefixes are accepted: `copilot/*`,
`dependabot/*`, `jimmypaolini/copilot/*`, `renovate/*`.

### Commit Messages

`<type>(<scope>): <gitmoji> <subject>` — **single line, max 128 chars.** Type and
scope lowercase and from the tables below, gitmoji as the subject's first token,
subject lowercase and present-imperative (`add`, not `added`), no trailing
period.

**Body and footer are forbidden**, with one exception: lines that are exactly
`Co-authored-by: ...` trailers, in any casing. Everything else goes in the
subject or the pull request description. Never list multiple changes — summarize
higher or split the commit.

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` ·
🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
```

### Release Significance

This repository squash-merges with `PR_TITLE`, so **the pull request title is the
only thing semantic-release ever sees** — every commit on the branch is discarded
when it squashes. `release.config.cjs` maps type to bump: `feat` → minor;
`fix`, `perf`, `refactor`, `build`, `revert` → patch; `docs`, `style`, `test`,
`ci`, `chore` → none; a breaking change (`!` after the scope, or a
`BREAKING CHANGE:` footer) → major regardless of type.

[pull-request-release-significance](tools/validation/src/modules/pull-request-release-significance/pull-request-release-significance.command.ts)
fails the pull request when the title's type is **less** significant than the most
significant commit on the branch, or when a commit uses a scope the title does
not name. Nothing else catches a title that understates its branch — 📝 Validate
Pull Request Title only checks that the title is well-formed.

**So pick the type and scope for the branch as a whole before committing**, and
keep every commit at or below it:

- A `feat` commit on a branch titled `chore` fails the check — retitle the pull
  request, or move that commit to its own branch.
- Mixing `feat` and `fix` is fine: title it `feat`, which outranks `fix`. Only a
  commit _more_ significant than the chosen type is a problem.
- A commit's scope must be named by the title. A multi-scope title is allowed —
  `feat(documentation,synchronization): …`.
- This is why [Work Scope](#work-scope) asks for one project per pull request.

### Pull Requests

The title follows the commit format and is checked by the same commitlint
configuration, so every rule above applies. **The description must contain all
four headings verbatim** — Validate Conventions greps for each one:

```markdown

## 🌰 Summary

<!-- Brief description of what this PR does (1-2 sentences) -->

## 📝 Details

- <!-- List of specific changes made -->

## 🧪 Testing

1. <!-- How to manually verify these changes work correctly -->

## 🔗 Related

- <!-- Link any relevant documentation or related resources like internal documentation, GitHub issues/pull requests -->
```

**Labels and assignees must agree with the title:** exactly one `type:*` matching
its type, exactly the `scope:*` labels its scopes name and no extras, at least
one assignee, and exactly one `source:*` (`source:agent` or `source:human`) —
that last one is not derived from the title. `do-not-merge` blocks the pull
request while present. 🧑‍⚖️ Validate Conventions creates any missing label on
`opened`/`reopened`, so a fresh pull request already has the vocabulary
available. [create-pull-request](.agents/skills/create-pull-request/SKILL.md)
and [submit-changes](.agents/skills/submit-changes/SKILL.md) automate all of it.

### Conventional Naming

`configuration/conventional.config.cjs` is the only source of this vocabulary,
and **both tables below are generated from it** — as are the copies in
[`CONTRIBUTING.md`](CONTRIBUTING.md), `.vscode/settings.json`, the issue
template, and the five naming skills. Do not hand-edit a table between its
`types-` or `scopes-` markers; add the type or scope to the configuration and
run the synchronizer, which `nx affected` gates:

```bash
pnpm exec nx run synchronization:conventional-config:write
```

#### Types

<!-- types-start -->

| Type | Description |
| ---- | ----------- |
| `feat` | A new feature or capability that adds value for users |
| `fix` | A bug fix that addresses a specific issue or problem |
| `docs` | Documentation, AGENTS.md, SKILL.md, README, and planning files |
| `test` | Adding or correcting unit, integration, or end-to-end tests |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature |
| `style` | Formatting, whitespace, or code structure changes with no semantic effect |
| `perf` | A code change that improves performance (caching, query optimization, etc.) |
| `chore` | Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.) |
| `ci` | GitHub Actions workflows, composite actions, and CI/CD scripts |
| `build` | Build system, Vite/Docker/Helm config, or external dependency integration |
| `revert` | Reverts a previous commit |

<!-- types-end -->

#### Scopes

<!-- scopes-start -->

| Scope | Description |
| ----- | ----------- |
| `affirmations` | Python Jupyter notebook application for LangGraph affirmation generation |
| `caelundas` | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris) |
| `configuration` | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.) |
| `conformetry` | Code generator templates and validation tests for generated instances |
| `dependencies` | Dependency version changes (upgrades, additions, removals via pnpm) |
| `deps` | Dependency version changes (upgrades, additions, removals via pnpm) |
| `deployments` | GitHub Actions workflows and CI/CD pipeline configuration |
| `documentation` | Markdown docs, skills, planning files, and AGENTS.md files |
| `infrastructure` | Helm charts, Terraform configs, and Kubernetes resources |
| `JimmyPaolini` | Static GitHub profile README project (markdown and assets) |
| `lexico` | TanStack Start SSR Latin dictionary web app with Supabase backend |
| `lexico-components` | Shared React/shadcn component library |
| `lexico-entities` | Shared TypeORM entities and GraphQL types |
| `lexico-ingestion` | Data ingestion scripts for Lexico |
| `meanderaw` | Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads |
| `sempientor` | Lexical gap discovery CLI that surveys English for morphological, phonotactic, and semantic gaps and coins words to fill them |
| `callidescope` | Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph |
| `codependix` | Dependency graph export CLI, the configuration package it reads, and the package that judges the graphs against declared rules |
| `codometer` | Code statistics measurement CLI, the configuration package it reads, and the packages that diff and render its pull request change report |
| `no-release` | Escape hatch: suppress semantic-release for any commit type |
| `release` | Version bumps and release commits generated by semantic-release |
| `reporting` | Pull request change report generation and the packages that diff and render it |
| `scripts` | Shell and TypeScript scripts in scripts/ (sync, setup, utilities) |
| `testing` | Vitest configuration, shared test utilities, and coverage setup |
| `synchronization` | Synchronization application and commands for automating workflows |
| `validation` | Validation CLI and the checks it runs, such as pull request metadata |

<!-- scopes-end -->

## Key Conventions

### Abbreviations

<!-- The rule below has to spell out the abbreviations it bans. cspell:ignore req, res -->

- **No Acronyms or Abbreviations**: Never use acronyms or abbreviations for variable names, function names, parameters, etc.
- Use explicit and unabbreviated names (e.g. `request` instead of `req`, `response` instead of `res`, `index` instead of `i`, `error` instead of `e`).
- **Exceptions**: Abbreviations are acceptable when avoiding language reserved word collisions (e.g., using `args` instead of `arguments`, `str` instead of `string`).
- Abbreviation rules are enforced by ESLint (`unicorn/prevent-abbreviations`) for TypeScript and JavaScript identifiers, and by CSpell (`flagWords`) for every other file type — Markdown, Python, SQL, YAML, JSON — plus comments and string literals.
- CSpell sees raw text, so external vocabulary that spells an abbreviation (Tailwind classes, JSDoc tags, TypeORM identifiers, POSIX paths) is carved out by a named pattern in `configuration/cspell.config.yaml`. For a one-off, add a `cspell:ignore <word>` comment to the file with a note explaining where the name comes from.

### File Naming

- **Kebab-case**: All file names must be lowercase with hyphens separating words (e.g., `my-file-name.ts`).
- **Always** prefer service files `*.service.ts` over `*.ts` or `*.utilities.ts` for NestJS service classes.
- Only use utilities files `*.utilities.ts` in cases where a top level function is needed, and only use them to invoke service class methods or to compose multiple service class methods together. Never use utilities files to implement business logic directly.

### Project Structure

Folder and file placement is a lint error, not a style preference. It is enforced by `eslint-plugin-project-structure` from `configuration/codebase-structure.json`.

<!-- The folder-name rule below has to spell out the names it bans. cspell:ignore ctx -->

- **Every folder is kebab-case** (`^[a-z0-9-]+$`). The abbreviated names `dir`, `err`, `req`, `res`, `utils`, `ctx`, and `app` are rejected outright as folder names.
- **Projects live in `applications/`, `packages/`, or `tools/`.** Adding a new file or folder at the workspace root requires adding it to `configuration/codebase-structure.json` in the same change, or lint fails.
- **Project subfolders are a fixed set**: `src/`, `testing/`, `scripts/`, `examples/`, `skills/`, `data/`, `coverage/`, `output/`, `public/`, `.vscode/`. `applications/`, `packages/`, and `tools/` themselves hold projects and nothing else — a file directly in one is a lint error.
- **`src/` subfolders are a fixed set**: `modules/`, `components/`, `lib/`, `routes/`, `hooks/`, `styles/`, `assets/`, `executors/`, `generators/`, and `python/` — the last is allowed at any `src/` root, though only `conformetry-languages` has one, for the Python bridge it ships inside a TypeScript package.
- **A `src/` root holds entry points and nothing else.** A file sitting directly in `src/` must be named `constants`, `index`, `main`, `repl`, or `router`, or be `main.module` or `main.utilities`, optionally with `.unit.test`, `.integration.test`, or `.end-to-end.test` before the extension. A `src/plugin.ts` entrypoint is forbidden. Anything else — a helper, a generated artifact, a `scratch.ts`, a stray `.json` — is a lint error: move it into the module that owns it under `src/modules/`, or into `src/lib/`.
- **The Python entries are declared, not enforced.** Snake_case `*.py`/`*.ipynb` and `py.typed` are accepted at any project's `src/` root and gate nothing — ESLint lints no `.py` file here. They exist so the config describes the tree truthfully.
- **Files inside `src/modules/<module-name>/` must be `<kebab-name>.<suffix>.<extension>`** where suffix is one of `command`, `constants`, `module`, `service`, `types`, or `utilities`, optionally with `.unit.test`, `.integration.test`, or `.end-to-end.test` before the extension. A bare `<name>.ts` inside a module folder is invalid — pick a suffix. There is deliberately no `errors` suffix: an error class lives in the `*.constants.ts` file beside the code that throws it, which the **Constant File Shape** rule permits by whitelisting `class X extends Error`.
- **A file a framework insists on is relocated and configured, never exempted.** lexico's TanStack entries live in `src/lib/` and are named in `vite.config.mts`; `src/router.tsx` is the one that cannot move. See [ADR 0011](docs/adr/0011-hold-one-path-law-for-every-project-type.md).
- **A module folder is a conformance instance**, so `src/modules/<name>/` is not a dumping ground for a single relocated file: a folder holding only a `*.constants.ts` matches three module templates equally well and fails as ambiguous, and one holding only a `*.utilities.ts` fails as unmatched. Put a relocated helper in the module that already owns its concern.
- **This file is the universal path and naming law; conformetry owns what a project of a given type must contain.** It matches paths and cannot read Nx tags, so it is deliberately not split by project type — see [ADR 0011](docs/adr/0011-hold-one-path-law-for-every-project-type.md).
- Scaffold with a conformetry generator rather than hand-building the tree; the generators already produce this layout.

Structure is judged in **one** ESLint pass, and it reaches markdown and HTML
paths as well as code — including generated pages like `openwiki/`, which are
excluded from the markdown _content_ rules but still have their paths judged.
Reach comes from the root `eslint` target's trailing `**/*.md`, a workspace-wide
glob rather than a list of directories on purpose: an enumerated list only
judges the directories somebody remembered to add. Without this an undeclared
markdown file — or a whole directory of them — passes lint silently. How that
single pass is assembled is
[ADR 0008](docs/adr/0008-judge-structure-in-one-eslint-pass.md).

One trap when changing any of this: **`projectStructure.cache.json` masks edits.** Delete it, and `.eslintcache/` beside it, before testing a change to `configuration/codebase-structure.json` — otherwise the edit appears to have no effect and the test proves nothing.

A second trap: a rule `name` is **not** a plain regex — dots are written unescaped, `*` is a path wildcard, and no brace may appear in one. [ADR 0011](docs/adr/0011-hold-one-path-law-for-every-project-type.md) has the details before you edit that file.

### Project Tags

Every project declares tags in its `project.json`: `type:*`, `language:*`, `framework:*`, `domain:*`, and `name:<project>`.

- **`language:typescript`** — applied to all TypeScript projects (caelundas, lexico, lexico-components, conformetry packages, codebase)
- **`language:python`** — applied to all Python projects (affirmations)

These tags enable conditional sub-target composition in composite targets (`format`, `lint`, `typecheck`, `test`). Python projects override the TS-default composite targets to compose Python sub-targets (`ruff-format`, `ruff-lint`, `pyright`, `pytest`) instead of TS ones.

See the [write-python skill](.agents/skills/write-python/SKILL.md) for the full Python tooling setup.

### Nx Boundaries

`@nx/enforce-module-boundaries` derives import rules from the tags above. Check these before adding a cross-project import — a violation fails `lint`, not `typecheck`, so it surfaces late.

- **`type:application` may only import `type:package` projects.** Applications never import other applications.
- **`type:package` may never import a `type:application`.**
- **`framework:react` may not import `framework:nestjs`.**
- **`domain:lexico` and `domain:caelundas` may never import each other.**
- **Conformetry packages form a strict layered graph** keyed on `name:conformetry-*` tags. `conformetry-core` is the leaf and depends on nothing; every other package declares exactly which siblings it may import. Read the `depConstraints` list in `configuration/eslint.config.ts` before wiring a new dependency between them.

These are import-statement rules, and `codependix --check boundaries` states
the ones they structurally cannot — an implicit Nx edge with no import to
flag, a NestJS module edge the container resolved rather than a file
declared, and a rule about the shape of the graph rather than about one edge.
The two do not overlap and neither replaces the other: ESLint reports at the
import site with a line number, which a graph-level report cannot match. See
[IC-Suite](#ic-suite) and
[`packages/codependix-boundaries`](packages/codependix-boundaries).

`@nx/dependency-checks` additionally requires that every imported package is declared in that project's own `package.json`. Add it with `pnpm add --filter <project> <package>` rather than editing `package.json` by hand.

### TypeScript

Strict everywhere: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`. No `any` — use `unknown` or a real type. No non-null
assertions — use optional chaining or an explicit guard. Explicit return types
on every function. Include `.js` extensions on relative imports, which NodeNext
resolution requires.

**Everything else is in the [write-typescript](.agents/skills/write-typescript/SKILL.md)
skill** and its `references/`: type imports, readonly class properties,
exhaustive switches, floating promises, control-flow style, the 3-parameter
limit, JSDoc on public APIs, and test typing patterns. Comment conventions —
including the `// <emoji> <Section name>` format — are in
[write-comments](.agents/skills/write-comments/SKILL.md).

**NestJS class file shape:** in `*.service.ts`, `*.command.ts`, `*.resolver.ts`,
`*.dataloader.ts`, and `*.module.ts`, keep only imports and the class at top
level. Helper types go in `*.types.ts`, constants in `*.constants.ts`, and never
use alias or type re-exports from a class file.

### Size Limits

Hard ESLint errors on source files. Test files (`*.test.ts`, `testing/**`) and `*.config.*` files are exempt from all of them, so a large test file is fine and a large service file is not.

| Limit                                         | Max                                                |
| --------------------------------------------- | -------------------------------------------------- |
| Lines per file (`max-lines`)                  | 512                                                |
| Lines per function (`max-lines-per-function`) | 128                                                |
| Statements per function (`max-statements`)    | 16                                                 |
| Block nesting depth (`max-depth`)             | 4                                                  |
| Nested callbacks (`max-nested-callbacks`)     | 3                                                  |
| Classes per file (`max-classes-per-file`)     | 1                                                  |
| Function parameters (`better-max-params`)     | 3 — constructors 12, functions in `*.module.ts` 12 |
| Cyclomatic complexity                         | 8 (warning)                                        |
| Nested `describe` blocks                      | 3                                                  |

When a file nears 512 lines, split it along the module file suffixes (`*.types.ts`, `*.constants.ts`, another `*.service.ts`) instead of raising the limit. Never add a disable comment or edit the threshold to make a file fit.

**Comment blocks are capped at 128 words**, and shell at 256 — declared in
[`configuration/codometer.config.ts`](configuration/codometer.config.ts) and
enforced by codometer rather than ESLint, so a breach names a file and line
rather than a rule. Shell is looser because `scripts/shell/` holds command
references whose whole body is one block documenting flags. The
[codometer-configure](.agents/skills/codometer-configure/SKILL.md) skill covers
how a block is delimited, which languages are measured how accurately, and the
`documentation` budget this repository leaves unset;
[codometer-triage](.agents/skills/codometer-triage/SKILL.md) covers a breach.

**Compiled size is gated per project** by each `codometer.config.ts`, and
`codebase:codometer` gates the repository-wide limits. Both run through
`make-projects` rather than 🧑‍💻 Lint Codebase, because a project has to compile
before it can be measured.

### Formatting and Ordering

Formatting is not a judgement call — `lint-codebase --configuration=write`
produces the canonical result, using `oxfmt` rather than prettier. Import groups
and broad alphabetical ordering are enforced, and cross-project imports use the
workspace package name rather than a relative path.

The exact settings, the seven import groups, everything alphabetical order
reaches, and the `exports`-map trap are in
[write-typescript](.agents/skills/write-typescript/references/formatting-and-ordering.md).

### Testing

- **Unit** (`*.unit.test.ts`): Pure functions, mocked I/O, fast (< 100ms)
- **Integration** (`*.integration.test.ts`): Database/API, real I/O, moderate (1-2s)
- **End-to-end** (`*.end-to-end.test.ts`): Full workflows, real services, slow (30-60s)

```bash
nx run <project>:vitest:unit        # Fast feedback
nx run <project>:vitest:integration # Database validation
nx affected --target=vitest         # Only changed projects
```

Test files live beside the code they cover. Vitest lint rules require `it` over
`test`, `vi` over `vitest`, `describe.each`/`it.each` over hand-rolled loops, and
no `.only`, `.skip`, or commented-out tests.

#### Coverage Gates

Four numbers, and **passing one proves nothing about the others**:

| Gate | Threshold | Where it is declared |
| ---- | --------- | -------------------- |
| Test coverage | 96% branches, functions, lines, statements | `configuration/vitest.config.ts` |
| Type coverage | Per project, most at 100 | that project's `package.json` (`typeCoverage.atLeast`) |
| Compiled size | Per project, only where something is emitted | that project's `codometer.config.ts` |
| Duplication | **Not a gate** — advisory, nothing in CI runs it | `configuration/jscpd.config.json` |

**Lowering a threshold to make a change pass is not an option — fix the code.**

Type coverage is the one most often skipped, because `typecheck` passing looks
like the same assurance and is not. Run both for any touched project that
defines the target. A compiled-size breach fails 👷 Make Projects and names the
project in the `## ⏲️ Codometer` section of the pull request.

The [testing-strategy](.agents/skills/testing-strategy/SKILL.md) skill covers all
four gates and the patterns for raising coverage;
[codometer-configure](.agents/skills/codometer-configure/SKILL.md) covers
declaring a size limit and reading the workspace's as a set.

### Build Output and Publishing

- **Every build writes into its own project's `dist/`** — `packages/logger/dist`,
  `applications/caelundas/dist` — never a top-level one. `dist` is already
  gitignored and in the folder-structure rule's `ignorePatterns`.
- **`configuration/tsconfig.json` sets `declaration: true`**, so every build
  emits `.d.ts` beside its `.js`. Turning it off silently removes the types a
  published package ships.
- **A package's `main`, `types`, and `exports` point at TypeScript sources**, and
  `publishConfig` carries the emitted `dist/` paths beside them — pnpm applies
  those at publish time, so one manifest serves the workspace and a published
  consumer. **Verify a change here by packing, not by reading:** `pnpm pack` in
  the package, then inspect the tarball's `package.json`.
- **`files` must name `dist`.** Without it, packing falls back to the ignore
  files and the tarball ships no build output at all.
- **A plugin entry's `resolvePluginService` must stay a static import.** A
  dynamic `import()` escapes the `@swc-node/register` require hook into Node's
  own ESM resolver, and `nx g` then fails with `Cannot find module
  './modules/plugin/plugin-context.utilities'`.

Why the manifest fields stay on sources, which `publishConfig` fields pnpm
actually applies, and why shrinking the Nx plugin closure buys nothing is
[ADR 0009](docs/adr/0009-keep-manifest-fields-on-typescript-sources.md). **Do
not point `main` or `exports` at `dist/`** — it deadlocks the plugin graph load
and breaks `fallow-dead-code` and `vitest`.

## Agent Context

`.agents/skills/` and this file are the single sources of truth. Every other agent entrypoint is a symlink to them, so edit the source and never the mirror:

| Symlink                           | Target           |
| --------------------------------- | ---------------- |
| `CLAUDE.md`                       | `AGENTS.md`      |
| `.claude/skills`                  | `.agents/skills` |
| `.github/copilot-instructions.md` | `AGENTS.md`      |
| `.github/skills`                  | `.agents/skills` |

### Session Hooks

Four checks run at the start of every agent session and inject their failure as
additional context. **Fix what they report before writing any code** — each one
names the problem and the command that repairs it.

| Script                                  | Checks                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `validate-session-branch-name.sh`       | Branch follows `<type>/<scope>-<description>`; directs the agent to the rename-branch skill           |
| `validate-session-commit-signing.sh`    | `commit.gpgsign`, `user.signingkey`, and a GPG signing smoke test                                     |
| `validate-session-gh-authentication.sh` | The active `gh` account plus Projects access                                                          |
| `validate-session-skills.sh`            | Every skill declared in `skills-lock.json` is present; directs the agent to `codebase:install-skills` |

Each script is registered twice, once per harness, and both registrations point
at the same file:

| Harness        | Registration                                      |
| -------------- | ------------------------------------------------- |
| Claude Code    | `SessionStart` entries in `.claude/settings.json` |
| GitHub Copilot | `sessionStart` entries in `.github/hooks/*.json`  |

When adding a check: put the script under `scripts/git/`, emit through
`scripts/git/emit-session-hook-context.sh` so both harnesses can read it, and
register it in both places. Why the credential checks resolve the session's own
token and signing configuration rather than the hook shell's, and why a hook can
fail but never hang, is
[ADR 0010](docs/adr/0010-judge-the-credentials-a-session-really-uses.md).

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

**Every skill is committed**, vendored ones included. They are checked in rather
than restored on demand for one reason: **a skill only becomes a slash command
if its file is on disk when the session starts.** Nothing runs between
`git worktree add` and an agent session, so a gitignored skill leaves
`/grill-with-docs` reporting `Unknown command` for the whole of that first
session. Committing them makes a fresh clone or worktree work with no setup step
at all.

`skills-lock.json` maps each skill to its source, and `skills update` rewrites
the lockfile and the skill folders together so upstream drift arrives as a
reviewable pull request rather than silently. `upgrade-dependencies.yml` runs it
weekly. Upstream licenses travel with the copies in
[`.agents/licenses/`](.agents/licenses), as MIT and Apache-2.0 both require.

```bash
pnpm exec skills update
```

`scripts/install-skills.sh` restores folders that are genuinely absent — after
`skills update` adds a lockfile entry, or when one has been deleted. It is
idempotent, never leaves tracked files dirty, and never fails an install,
because a missing skill is a broken agent workflow rather than a broken build:

```bash
pnpm exec nx run codebase:install-skills
```

Five things reach `.agents/` and so must skip the **vendored** skills while
still covering this repository's own: `prettier` scans `.`, `codometer` scans
`--directory .`, GitHub Linguist reads every committed file (one vendored skill
ships half a megabyte of bundled browser JavaScript that would otherwise
dominate the language bar), and `cspell` and `markdownlint` both reach
`.agents/` because this repository's own skills are documentation and are held
to the same standards as the rest of its prose. Correcting a vendored skill's
spelling or reflowing its tables would be a change this repository has no right
to make.

The exclusions are generated, not hand-maintained. Each file marks its block
with `installed-skills-start` and `installed-skills-end` comments in its own
syntax — `#` in `configuration/.prettierignore`,
`configuration/.codometerignore`, `configuration/cspell.config.yaml`, and
`.gitattributes`; `//` in `configuration/.markdownlint-cli2.jsonc` — and the
`skill-exclusions` synchronizer rewrites what sits between them from the
lockfile. It joins `lint-codebase` in the same `nx affected` invocation, so a
stale list fails there rather than silently:

```bash
pnpm exec nx run synchronization:skill-exclusions:write
```

Two details of that machinery matter before changing it:

- **A wholesale pattern defeats the whole arrangement**, and no check catches
  it. Re-adding `**/.agents/skills/**` outside a managed block leaves every
  per-skill entry in place while quietly taking this repository's own skills
  back out of scope, and the synchronizer reports nothing because its own block
  still matches the lockfile. **Exclude a vendored skill by name.**
- **The root `project.json` mirrors the exclusions as cache negations.** Its
  `vendored-skills` named input drops them from the `spell-check` and
  `markdown-lint` `inputs`, because a tool that ignores a file has no reason to
  rehash on it. That is a cache optimization rather than a correctness gate.

Every other tool scopes itself with explicit globs that never include
`.agents/`.

### Agent Skills Configuration

The [mattpocock/skills](https://github.com/mattpocock/skills) engineering skills
read their per-repository configuration from `docs/agents/`. Edit these files
directly; re-run `/setup-matt-pocock-skills` only to switch issue trackers or
start over.

| Concern       | Setting                                                                                                                          | Reference                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Issue tracker | GitHub Issues in `JimmyPaolini/codebase`, via the `gh` CLI — a spec, then one issue per pull request, then one per commit        | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage labels | The five canonical roles mapped onto this repository's `status:` label family                                                    | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Domain docs   | Single-context — one root `CONTEXT.md` plus root `docs/adr/`                                                                     | [`docs/agents/domain.md`](docs/agents/domain.md)               |

`CONTEXT.md` and `docs/adr/` are both populated now.
[domain-modeling](.agents/skills/domain-modeling/SKILL.md) grows them lazily, as
terms and decisions actually get resolved — so add to them when a decision
lands, rather than scaffolding ahead of the work.

### Agents

This repository keeps no custom agent definitions. The four it used to hold each
duplicated a skill in [`.agents/skills/`](.agents/skills) with nothing to keep
the copies in step, and they drifted. Every agent entrypoint is a symlink to that
one directory, so a skill is the only place a behavior needs to be written down.
Add a skill rather than reintroducing an agent file.

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
  [Testing](#testing) for the real target names.

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
