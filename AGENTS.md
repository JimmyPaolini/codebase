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

Use the [mattpocock/skills](https://github.com/mattpocock/skills) workflow for non-trivial features,
refactors, and bugfixes so the work is clarified, specified, tracked, and
implemented in a consistent way.

1. Sharpen the request first. Run
   [grill-with-docs](.agents/skills/grill-with-docs/SKILL.md) when the work
   needs a domain model or ADRs to come out of the conversation, or
   [grill-me](.agents/skills/grill-me/SKILL.md) for a plain interview. Unsure
   which skill fits? Ask [ask-matt](.agents/skills/ask-matt/SKILL.md).
2. Capture the outcome with [to-spec](.agents/skills/to-spec/SKILL.md), then
   split it with [to-tickets](.agents/skills/to-tickets/SKILL.md) when the work
   spans multiple tasks. Reach for
   [wayfinder](.agents/skills/wayfinder/SKILL.md) when the work is larger than
   one agent session can hold.
3. Build with [implement](.agents/skills/implement/SKILL.md), which drives
   [tdd](.agents/skills/tdd/SKILL.md) red-green-refactor. For a multi-task
   ticket set, orchestrate with
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
   — one fresh subagent per task — and use
   [dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)
   when tasks are genuinely independent. Debug regressions with
   [diagnosing-bugs](.agents/skills/diagnosing-bugs/SKILL.md).
4. Review with [code-review](.agents/skills/code-review/SKILL.md), and apply
   incoming feedback through
   [receiving-code-review](.agents/skills/receiving-code-review/SKILL.md)
   rather than agreeing on sight.
5. Finish with [validate-code](.agents/skills/validate-code/SKILL.md), gated by
   [verification-before-completion](.agents/skills/verification-before-completion/SKILL.md):
   never claim done without the command output that proves it.

The codebase-native skills still own this repository's mechanics — branch
names, commits, pull requests, Nx targets, and validation. Prefer them over any
general-purpose equivalent, and see the [Skills](#skills) list for the full set.

## Projects

### Applications

- **[affirmations](applications/affirmations)**: Python Jupyter notebook application for LangChain + LangGraph affirmation generation (Ollama gemma4:e2b, ReAct agent, SearxNG metasearch with Trafilatura research processing)
- **[caelundas](applications/caelundas)**: Node.js CLI for astronomical calendar generation (NASA JPL API)
- **[JimmyPaolini](applications/JimmyPaolini)**: Portfolio website
- **[lexico](applications/lexico)**: SSR web app (React 19, TanStack Start)
- **[lexico-ingestion](applications/lexico-ingestion)**: NestJS CLI app for Latin dictionary data ingestion
- **[meanderaw](applications/meanderaw)**: NestJS CLI for generating Greek meander (key/fret) SVG patterns

### Packages

- **[codometer-changes](packages/codometer-changes)**: Diffs codometer reports against a baseline snapshot
- **[codometer-customization](packages/codometer-customization)**: Evaluates codometer's configured custom counters
- **[codometer-discovery](packages/codometer-discovery)**: Glob matching and gitignore-aware file walking, plus resolving configured measurement targets to file sets
- **[codometer-languages](packages/codometer-languages)**: Every input language analyzer codometer measures, behind one `analyze()` call
- **[codometer-output](packages/codometer-output)**: Every codometer output format — JSON reports, README badges, and the pull request change report
- **[codometer-size](packages/codometer-size)**: Compresses a target's matched files and measures their size
- **[lexico-components](packages/lexico-components)**: Shared React component library (shadcn/ui, Radix UI)
- **[lexico-entities](packages/lexico-entities)**: Shared TypeORM entities and GraphQL types package
- **[logger](packages/logger)**: Shared pino-backed NestJS `LoggerService` and `LoggerModule`

### Tools

- **[callidescope-cli](packages/callidescope-cli)**: Command-line host that traces call stacks through injected dependencies and flags the ones that are too deep
- **[callidescope-configuration](packages/callidescope-configuration)**: Reads `callidescope.config.ts` and resolves the limits callidescope enforces
- **[callidescope-graph](packages/callidescope-graph)**: Builds the call graph from traced TypeScript source and measures its depth, breadth, and cohesion
- **[callidescope-output](packages/callidescope-output)**: Renders call-graph findings into markdown, mermaid, and JSON output formats
- **[codependix-cli](packages/codependix-cli)**: Command-line host that exports dependency graphs as JSON and Markdown anchor blocks
- **[codependix-configuration](packages/codependix-configuration)**: Reads `codependix.config.ts` and resolves per-project export destinations
- **[codependix-examples](packages/codependix-examples)**: Sixteen worked examples of everything codependix builds, rendered by the real graph builders from fixtures in the package
- **[codependix-imports](packages/codependix-imports)**: Builds a project's file-level import graph — a `typescript` module walking its own `ts.Program`, and a `python` module parsing `import`/`from ... import` statements
- **[codependix-nestjs](packages/codependix-nestjs)**: Explores a NestJS project's container and builds its module graph
- **[codependix-nx](packages/codependix-nx)**: Builds a project's one-hop Nx dependency neighborhood from the Nx project graph
- **[codometer-cli](packages/codometer-cli)**: Command-line host that measures code statistics and writes them to markdown and JSON — see [Codometer](#codometer) for its agent skills
- **[codometer-configuration](packages/codometer-configuration)**: Reads `codometer.config.ts` and resolves the repository-specific settings codometer needs
- **[conformetry-cli](packages/conformetry-cli)**: Command-line host for code generation and validation
- **[conformetry-nx](packages/conformetry-nx)**: Nx plugin that exposes the conformetry generator namespace
- **[synchronization](tools/synchronization)**: NestJS CLI for synchronizing codebase configuration and documentation artifacts
- **[validation](tools/validation)**: NestJS CLI for the repository's one-sided checks — the ones with a `check` and no `write`, such as the pull request metadata gate

## Conformetry

Conformetry generators scaffold projects, modules, and components from
**templates**; conformance then measures the generated **instances** back against
those templates. The two are one workflow: code hand-written in a shape a
template already describes starts life failing conformance.

**Generate rather than hand-craft**, then check conformance. Reach for a
generator whenever creating a new application, package, module, or component.

```bash
nx g conformetry:<generator-or-alias> [options]
pnpm nx run-many --targets=conformetry-validate
```

Three skills carry the detail — how the two entrypoints differ, what a template
may declare, and how to act on a difference. Load the one that fits the task:

- [conformetry-generate](.agents/skills/conformetry-generate/SKILL.md)
  — scaffolding with a generator
- [conformetry-configure](.agents/skills/conformetry-configure/SKILL.md)
  — adding a generator, or writing its template
- [conformetry-validate](.agents/skills/conformetry-validate/SKILL.md)
  — running conformance and fixing differences

These three are authored in
[`packages/conformetry-agents`](packages/conformetry-agents) and installed back
from the lockfile like any other vendored skill, so what this repository loads is
exactly what another workspace gets. Edit the package, never the installed copy —
`skills update` overwrites it.

The generator namespace is emitted from `configuration/conformetry.config.ts`
into the gitignored `.conformetry/` directory on `pnpm install`, so it is never
committed. If Nx reports it is not installed, run `pnpm install` again. No
project is called `conformetry` — the name means the generator namespace and
nothing else, and the command-line host is `conformetry-cli`.

This repository's generators, kept in step with the configuration by
`nx run synchronization:conformetry-generators`. `conformetry templates` prints the
same thing for any workspace:

<!-- conformetry-generators-table start -->
| Template | Alias | Description |
| -------- | ----- | ----------- |
| `jupyter-notebook-application` | `jna` | A standalone Python application template with a Jupyter notebook entry point, pytest/pyright/ruff tooling, and a shared uv workspace venv |
| `nestjs-command-project` | `nca` | A standalone NestJS CLI application template built on nest-commander, for a new command-line tool in applications/, packages/, or tools/ |
| `nestjs-graphql-application` | `nga` | A standalone NestJS GraphQL API application template, for a new backend service exposing a GraphQL schema over HTTP |
| `nestjs-service-project` | `nsp` | A standalone NestJS library package template for internal workspace code shared across projects, with no CLI entry point or HTTP server |
| `nestjs-command-module` | `ncm` | A nest-commander command module template — command, module, constants, types, and unit test — for an existing NestJS command-line project |
| `nestjs-dataloader-module` | `ndm` | A GraphQL dataloader module template — dataloader, module, types, and unit test — for batching lookups inside an existing NestJS project |
| `nestjs-graphql-module` | `ngm` | A GraphQL module template — resolver, entities, args/input types, factories, constants, and unit test — for an existing NestJS project |
| `nestjs-service-file` | `nsf` | A service and unit test file template for an existing NestJS module, without the surrounding module files |
| `nestjs-service-module` | `nsm` | A plain service module template — module, service, constants, types, and unit test — for an existing NestJS project |
| `react-component` | `c` | A React component and test file template for an existing React project |
<!-- conformetry-generators-table end -->

## Codometer

Codometer measures a directory and reports what it counted — languages,
declared conventions, and compressed size — gated by whatever limits a
configuration declares. Three skills carry that toolchain's behavior for a
coding agent, mirroring the split above: run the tool, tell it what to
enforce, act on what it said.

- [codometer-measure](packages/codometer-agents/skills/codometer-measure/SKILL.md)
  — running a measurement, or reading a report
- [codometer-configure](packages/codometer-agents/skills/codometer-configure/SKILL.md)
  — writing `codometer.config.ts`
- [codometer-triage](packages/codometer-agents/skills/codometer-triage/SKILL.md)
  — acting on a breach or a stale report

These three are authored in
[`packages/codometer-agents`](packages/codometer-agents). A follow-up records
them in `skills-lock.json` and vendors them into `.agents/skills/`, the way
[`packages/conformetry-agents`](packages/conformetry-agents) is consumed — that
can only happen once this package exists on the default branch, since the
skills tool resolves a `github` source against it.

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

### Quality Tools

| Tool            | Description                                           | Config                                   | Docs                                                    |
| --------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `oxfmt`         | Formats TS/JS/JSON/MD files                           | `configuration/oxfmt.config.ts`          | [docs](https://oxc.rs/docs/guide/usage/formatter.html)  |
| `sqlfluff`      | Formats and lints SQL files                           | root `pyproject.toml`                    | [docs](https://docs.sqlfluff.com/)                      |
| `prettier`      | Supplementary formatter for manual or non-default use | `configuration/prettier.config.ts`       | [docs](https://prettier.io/docs/)                       |
| `eslint`        | Lints TS/JS and markdown with workspace rules         | project `eslint.config.ts`               | [docs](https://eslint.org/docs/latest/)                 |
| `oxlint`        | Fast TS/JS linting for workspace files                | `configuration/oxlint.config.ts`         | [docs](https://oxc.rs/docs/guide/usage/linter.html)     |
| `ruff`          | Formats and lints Python files                        | root `pyproject.toml`                    | [docs](https://docs.astral.sh/ruff/)                    |
| `tsc`           | Type-checks TypeScript                                | project `tsconfig.json`                  | [docs](https://www.typescriptlang.org/docs/)            |
| `type-coverage` | Enforces TypeScript type-coverage gates               | root `tsconfig.json`                     | [docs](https://github.com/plantain-00/type-coverage)    |
| `pyright`       | Performs static Python type checking                  | root `pyproject.toml`                    | [docs](https://github.com/microsoft/pyright)            |
| `ty`            | Performs additional Python type checking              | root `pyproject.toml`                    | [docs](https://docs.astral.sh/ty/)                      |
| `knip`          | Finds unused TS/JS files, exports, and dependencies   | `configuration/knip.config.ts`           | [docs](https://knip.dev/)                               |
| `vulture`       | Finds unused Python code                              | `configuration/vulture_whitelist.py`     | [docs](https://github.com/jendrikseipp/vulture)         |
| `fallow`        | Analyzes dead code, duplication, and code health      | `configuration/fallow.config.jsonc`      | [docs](https://docs.fallow.tools/)                      |
| `jscpd`         | Detects duplicated code and copy-paste patterns       | `configuration/jscpd.config.json`        | [docs](https://jscpd.dev/)                              |
| `callidescope`  | Traces call stacks and flags ones that are too deep   | `configuration/callidescope.config.ts`   | [docs](packages/callidescope-cli/README.md)             |
| `codependix`    | Exports Nx, NestJS, and file-level dependency graphs  | `configuration/codependix.config.ts`     | [docs](packages/codependix-cli/README.md)               |
| `cspell`        | Checks spelling across code and documentation         | `configuration/cspell.config.yaml`       | [docs](https://cspell.org/)                             |
| `markdownlint`  | Lints markdown files                                  | `configuration/.markdownlint-cli2.jsonc` | [docs](https://github.com/DavidAnson/markdownlint-cli2) |
| `yamllint`      | Lints YAML files                                      | `configuration/yamllint.yaml`            | [docs](https://yamllint.readthedocs.io/)                |

## Git Workflow

**Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.

**Do not run signing-check scripts manually in normal commit/push flows.** Husky already runs `scripts/git/check-commit-signing-configuration.sh` in pre-commit and `scripts/git/check-push-commit-signatures.sh` in pre-push.

**Never suppress lint or type errors** with disable comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `nocheck`) or by loosening configuration — triage and fix the code instead. Suppression is only permitted when the user explicitly requests it.

### Git Worktrees

Use [using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md) to create
or verify an isolated workspace. It prefers this harness's native worktree tool
over raw `git worktree add`, and falls back to `git worktree` when none exists.

Two repository rules override the skill's generic defaults:

- **The branch name is not free-form.** Derive or reuse a name matching
  `<type>/<scope>-<description>` from the [Conventional Naming](#conventional-naming)
  tables, and validate it with `pnpm exec validate-branch-name -t "<branch-name>"`
  before creating anything. See [checkout-branch](.agents/skills/checkout-branch/SKILL.md)
  for deriving one. The pre-push hook and the Validate Conventions workflow both
  reject a non-compliant branch, so an unvalidated worktree wastes the work.
- **If the branch already exists locally, attach a worktree to it** rather than
  creating a second branch.
- **Never run `git submodule update --init` for `applications/JimmyPaolini`.**
  `git worktree add` never checks out submodules — the git manual's own
  `WORKTREE` documentation calls submodule support "incomplete" and advises
  against multiple checkouts of a superproject — but this repository's
  submodule is deliberately left uninitialized everywhere, not only in
  worktrees: its real content is never checked out locally or in CI, and
  `package.json`'s `sherif.ignorePackage` already exempts it from workspace
  checks. A `git submodule status` `-` prefix here is expected, not broken.
  If `pnpm install` or `lint-codebase --write` rewrites the
  `applications/JimmyPaolini` entry out of `pnpm-lock.yaml`, that is the
  known spurious diff from an inconsistently-present placeholder
  `package.json` across checkouts — revert the lockfile rather than
  reconciling it, the same as any other worktree-only lockfile drift.

### Branch Names

Format: `<type>/<scope>-<description>` — all three parts required.

- **Type and scope** must be exact values from the [Conventional Naming](#conventional-naming) tables below. An invented scope fails validation even when the branch name reads well.
- **Description** is kebab-case matching `[a-z0-9-]+` — no uppercase, underscores, dots, or extra slashes.
- Validate before pushing: `pnpm exec validate-branch-name -t "<branch-name>"`. The pre-push hook and the Validate Conventions workflow both run it.

Examples: `feat/lexico-user-auth`, `fix/caelundas-timezone-bug`, `docs/codebase-architecture`

Only `main` is exempt from the convention. Automated prefixes are also accepted: `copilot/*`, `dependabot/*`, `jimmypaolini/copilot/*`, `renovate/*`.

### Commit Messages

Format: `<type>(<scope>): <gitmoji> <subject>` — single line only, max 128 chars.

- **Type and scope** must come from the [Conventional Naming](#conventional-naming) tables, both lowercase
- **Gitmoji required** as the first token of the subject line
- Subject: lowercase, present-imperative mood (`add`, not `added` or `adds`), no trailing period, never empty
- **Body and footer are forbidden**, with one exception: lines that are exactly `Co-authored-by: ...` trailers. All other context goes in the subject or the PR description
- Never list multiple changes — summarize at a higher level or split into separate commits

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` · 🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

Examples:

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
chore(dependencies): ⬆️ upgrade react to v19
docs(codebase): 📝 update contributing guide
```

### Release Significance

This repository squash-merges with `PR_TITLE`, so **the PR title is the only thing semantic-release ever sees** — every individual commit on the branch is discarded the moment it is squashed. `release.config.cjs`'s `releaseRules` map each type to a bump level: `feat` is `minor`; `fix`, `perf`, `refactor`, `build`, and `revert` are `patch`; `docs`, `style`, `test`, `ci`, and `chore` are `none`; a breaking change (`!` after the scope, or a `BREAKING CHANGE:` footer) is `major` regardless of type.

The [pull-request-release-significance](tools/validation/src/modules/pull-request-release-significance/pull-request-release-significance.command.ts) check reads the branch's own commits and fails the pull request when the title's type is **less** release-significant than the most significant commit reachable from the branch, or when a commit uses a scope the title's scopes do not name. A title that understates its branch is not caught by anything else — `📝 Validate Pull Request Title` only checks that the title itself is well-formed.

**Practical effect for an agent:** pick the type and scope for the _branch as a whole_ before committing, and keep every commit on it at or below that significance.

- Committing a `feat` while the branch (and its eventual title) is `chore` or `ci` fails this check — either retitle the pull request as `feat`, or move that commit to its own branch.
- A branch that mixes `feat` and `fix` work is still fine — title it `feat`, since `feat` outranks `fix`. Mixing types is only a problem when a later commit is _more_ significant than the type already chosen.
- This is also why [Work Scope](#work-scope) asks for one project or module per pull request: the fewer concerns a branch carries, the less likely it accumulates a commit that outranks the title picked at the start.

### Pull Requests

PR title follows the same format as commit messages — `<type>(<scope>): <gitmoji> <subject>` — and is checked by the same commitlint configuration, so every commit-message rule above applies to it.

The PR description must contain all four section headings verbatim. Validate Conventions greps for each one and fails the PR when any is missing.

PR description template:

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

Labels and assignees must also agree with the title: exactly one `type:*` label matching the title's type, exactly the `scope:*` labels named by the title's scopes with no extras, at least one assignee, and exactly one `source:*` label (`source:agent` or `source:human`) declaring who opened the pull request — this one is not derived from the title. The `do-not-merge` label blocks the pull request while it is present.

The 🧑‍⚖️ Validate Conventions workflow creates any label missing from this vocabulary on `opened`/`reopened`, so a freshly opened pull request already has the labels it needs before the check runs. The vocabulary itself comes from `configuration/conventional.config.cjs`, never hard-coded elsewhere.

### Conventional Naming

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
| `logger` | Shared pino-backed NestJS LoggerService, LoggerModule, and the log message convention |
| `meanderaw` | Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads |
| `callidescope` | Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph |
| `codependix` | Dependency graph export CLI and the configuration package it reads |
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
- **Project subfolders are a fixed set**: `src/`, `testing/`, `scripts/`, `data/`, `assets/`, `coverage/`, `output/`, `public/`, `.vscode/`.
- **`src/` subfolders are a fixed set**: `modules/`, `components/`, `lib/`, `routes/`, `hooks/`, `styles/`, `assets/`, `executors/`, `generators/`, `validators/`. A `src/plugin.ts` entrypoint is forbidden.
- **Files inside `src/modules/<module-name>/` must be `<kebab-name>.<suffix>.<extension>`** where suffix is one of `command`, `constants`, `errors`, `module`, `service`, `types`, or `utilities`, optionally with `.unit.test`, `.integration.test`, or `.end-to-end.test` before the extension. A bare `<name>.ts` inside a module folder is invalid — pick a suffix.
- Scaffold with a conformetry generator rather than hand-building the tree; the generators already produce this layout.

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

`@nx/dependency-checks` additionally requires that every imported package is declared in that project's own `package.json`. Add it with `pnpm add --filter <project> <package>` rather than editing `package.json` by hand.

### TypeScript

- **Strict mode enabled**: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`
- **Explicit return types** required for all functions
- **Type imports**: Use `import { type Foo } from './types'` (enforced by ESLint)
- **File extensions in imports**: Always include `.js` extensions for relative imports (required by NodeNext resolution)
- **No `any` types**: Use `unknown` or proper typing
- **No non-null assertions**: Never use `!` — use optional chaining or explicit guards
- **Readonly class properties**: Mark all never-mutated class properties as `readonly`
- **Exhaustive switches**: All switch statements on union types must handle every member
- **Async functions**: All functions returning `Promise` must use the `async` keyword
- **No floating promises**: Every Promise must be awaited or explicitly `void`-annotated
- **Consistent returns**: All code paths must uniformly return or not return a value
- **Curly braces**: Always use `{}` for `if`/`else`/`for`/`while` — no single-line forms
- **Early returns**: Remove `else` after a `return` — use guard clauses
- **Object shorthand**: Use `{ name }` instead of `{ name: name }`
- **Template literals**: Use `` `Hello ${name}` `` instead of `"Hello " + name`
- **Max 3 function parameters**: Group extras into an options object (constructors: 12)
- **JSDoc on public APIs**: Public functions, classes, methods, interfaces, types, and enums must have JSDoc — only when it adds non-obvious context
- **Section comments**: Use `// 🎯 Section name` (emoji + capitalized name). Never use dash lines or ASCII art dividers. See [write-comments skill](.agents/skills/write-comments/SKILL.md).
- **NestJS class file shape**: In `*.service.ts`, `*.command.ts`, `*.resolver.ts`, `*.dataloader.ts`, and `*.module.ts`, keep only imports and the class at top level. Move helper types/interfaces to `*.types.ts`, constants to `*.constants.ts`, and never use alias or type re-exports from class files.

See the [write-typescript skill](.agents/skills/write-typescript/SKILL.md) for strict mode patterns.

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

### Formatting and Ordering

Formatting is not a judgement call — `lint-codebase --configuration=write` produces the canonical result. Write code in the shape below so the first pass is a no-op.

- **`oxfmt` is the formatter** (not prettier): 80-column print width, 2-space indent, double quotes, semicolons, trailing commas everywhere, LF endings, one JSX attribute per line.
- **Import groups** (`perfectionist/sort-imports`): builtin → external → internal (`@codebase/*`) → parent → sibling → index → type, with exactly one blank line between groups and natural alphabetical order inside each group.
- **Alphabetical order is enforced** for named imports and exports, object literals, object types, interfaces, enums, union and intersection types, switch cases, class members, JSX props, `Map`/`Set` entries, and top-level module declarations. Object literals partition on blank lines and comments, so a blank line starts a fresh sorted run.
- **Cross-project imports use the workspace package name.** `import/no-relative-packages` is an error and `import/no-relative-parent-imports` warns; inside a project, prefer relative paths over path aliases.

### Testing

- **Unit** (`*.unit.test.ts`): Pure functions, mocked I/O, fast (< 100ms)
- **Integration** (`*.integration.test.ts`): Database/API, real I/O, moderate (1-2s)
- **End-to-end** (`*.end-to-end.test.ts`): Full workflows, real services, slow (30-60s)

```bash
nx run <project>:vitest:unit        # Fast feedback
nx run <project>:vitest:integration # Database validation
nx affected --target=vitest         # Only changed projects
```

Test files are named `*.<kind>.test.ts` and live beside the code they cover. Vitest lint rules also require `it` over `test`, `vi` over `vitest`, `describe.each`/`it.each` over hand-rolled loops, and no `.only`, `.skip`, or commented-out tests.

#### Coverage Gates

- **Test coverage: 96%** for branches, functions, lines, and statements (`configuration/vitest.config.ts`, v8 provider). New code needs tests in the same change to keep a project above the line.
- **Type coverage** is per project, declared as `typeCoverage.atLeast` in each project's `package.json` — most packages sit at 100 with `strict: true`, and the workspace root requires 95. Run `type-coverage` alongside `typecheck` for any touched project that defines the target; passing `typecheck` alone proves nothing about this gate.
- **Duplication**: not a gate, and no longer measured by anything scheduled. `jscpd` and `fallow-duplicates` both remain as targets to run by hand — `nx run codebase:jscpd` and `nx run codebase:fallow-duplicates` — and both are advisory: the `jscpd` target ends in `|| true`, and nothing in CI invokes either one. The 6% threshold in `configuration/jscpd.config.json` and `configuration/fallow.config.jsonc` is what those manual runs report against, not a bar a pull request has to clear. It sat at 5.9% when the last scheduled caller was removed. Extract a shared helper rather than copying a block because it is the better code, not because a check will stop you.
- **Bundle size** is per project, enforced by the `codometer` target, which builds first and measures the compiled output. Every package's gzipped limit is declared in the `PROJECT_LIMITS` table in `configuration/codometer.config.ts`, keyed by the project's path; `lexico` and `lexico-components` declare theirs in a `codometer.config.cjs` of their own because they measure several bundles each. Breaching one fails 👷 Make Projects, and the `## ⏲️ Codometer` section names the project. That section is rendered by `nx run codometer-cli:start -- changes` from the `codometer-report.json` each project's run leaves behind, diffed by `codometer-changes` and rendered by `codometer-output`.
- Lowering a threshold to make a change pass is not an option — fix the code.

See the [testing-strategy skill](.agents/skills/testing-strategy/SKILL.md) for patterns.

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
additional context, so the agent fixes the problem before writing any code. Both
harnesses run the same scripts under `scripts/git/`:

| Script                                  | Checks                                                                                                |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `validate-session-branch-name.sh`       | Branch follows `<type>/<scope>-<description>`; directs the agent to the rename-branch skill           |
| `validate-session-commit-signing.sh`    | `commit.gpgsign`, `user.signingkey`, and a GPG signing smoke test                                     |
| `validate-session-gh-authentication.sh` | The active `gh` account plus Projects access                                                          |
| `validate-session-skills.sh`            | Every skill declared in `skills-lock.json` is present; directs the agent to `codebase:install-skills` |

The skills check is a backstop. Now that every skill is committed, a checkout
holds them all and the check stays silent; it fires only when a skill folder is
genuinely absent — deleted locally, or newly added to `skills-lock.json` by
`skills update` and not yet materialized. It reports rather than restores,
because harnesses register skills when a session starts, so restoring from the
hook would still not expose them to the session already underway.

Each script is registered twice — once per harness — and both registrations point
at the same file:

| Harness        | Registration                                      |
| -------------- | ------------------------------------------------- |
| Claude Code    | `SessionStart` entries in `.claude/settings.json` |
| GitHub Copilot | `sessionStart` entries in `.github/hooks/*.json`  |

The two harnesses read different JSON shapes, so the scripts pipe their message
through `scripts/git/emit-session-hook-context.sh`, which emits
`hookSpecificOutput.additionalContext` when `CLAUDE_PROJECT_DIR` is set and a
top-level `additionalContext` otherwise. Remediation text also branches on
`CI`/`GITHUB_ACTIONS`: cloud agents are told to re-run
`copilot-setup-steps.yml`, local agents are given the `git config` and
`gh auth login` commands they can run themselves.

The signing smoke test never opens a pinentry, so a hook can fail but never hang:
CI signs through a `loopback` wrapper, and local agents sign through a `cancel`
wrapper that uses an already-cached passphrase and errors out in milliseconds
when there is none. A cancelled pinentry is reported as inconclusive rather than
as broken signing, because the following real commit prompts for the passphrase
normally.

The gh check reads the token the session will really send, which is not the one
a bare hook shell sees. A hook runs in a non-interactive shell that never sources
a shell profile, so `GH_TOKEN` and `GITHUB_TOKEN` are absent even when every
terminal in the session exports them, and `gh` silently falls back to its keyring
account — whose token is scoped for the browser login flow and carries no
`read:project`. Three things keep the check honest about which credential it is
judging:

- **It asks the login shell for the token** when neither variable is in the
  environment, fencing the value in markers so a profile that prints a banner
  cannot corrupt it. CI passes the token in explicitly and never asks.
- **`gh auth status` runs with `--active`**, because it otherwise tests every
  account in the keyring and fails when any one of them has a problem — including
  accounts no gh command in the session would ever use.
- **Only CI escalates to `gh auth login --with-token`.** That path deletes
  `~/.config/gh/hosts.yml` and rewrites the git credential helper, which is fine
  on a throwaway runner and destructive on a machine that already holds a working
  keyring account. Locally a bad token is reported, not repaired.

When adding a session check, add the script under `scripts/git/`, emit through
the shared emitter, and register it in both places.

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

**Every skill is committed**, including the ones vendored from other
repositories — the [mattpocock/skills](https://github.com/mattpocock/skills) set
that [Agent Workflow](#agent-workflow) is built on, and the rest recorded in
`skills-lock.json`. They are checked in rather than restored on demand for one
reason: a skill only becomes a slash command if its file is on disk when the
session starts. Nothing runs between `git worktree add` and an agent session, so
a gitignored skill leaves `/grill-with-docs` reporting `Unknown command` for the
whole of that first session. Committing them makes a fresh clone or worktree
work with no setup step at all.

Vendored skills stay in sync through `skills update`, which rewrites
`skills-lock.json` and the skill folders together, so upstream drift arrives as
a reviewable pull request rather than silently. `upgrade-dependencies.yml` runs
it weekly:

```bash
pnpm exec skills update
```

Their upstream licenses are vendored alongside them in
[`.agents/licenses/`](.agents/licenses), as MIT and Apache-2.0 both require the
license to travel with the copy. The last row is this repository consuming its
own published skills, so its license is the root [`LICENSE`](LICENSE) rather than
a vendored copy:

| Source                                                              | License    | Skills                                                               |
| ------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------- |
| [mattpocock/skills](https://github.com/mattpocock/skills)           | MIT        | 25, the Agent Workflow set                                           |
| [nrwl/nx](https://github.com/nrwl/nx)                               | MIT        | 7, the `nx-*` skills plus `monitor-ci` and `link-workspace-packages` |
| [obra/superpowers](https://github.com/obra/superpowers)             | MIT        | 5                                                                    |
| [github/gh-stack](https://github.com/github/gh-stack)               | MIT        | 1                                                                    |
| [github/awesome-copilot](https://github.com/github/awesome-copilot) | MIT        | 1                                                                    |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable)         | Apache-2.0 | 1                                                                    |
| [JimmyPaolini/codebase](https://github.com/JimmyPaolini/codebase)   | MIT        | 3, the `conformetry-*` skills this repository publishes              |

`skills-lock.json` maps each individual skill to its source.

Five things reach `.agents/` and so must skip the installed skills: `prettier`
scans `.`, `codometer` scans `--directory .`, GitHub Linguist reads every
committed file — one installed skill ships half a megabyte of bundled browser
JavaScript that would otherwise dominate the language bar, so `.gitattributes`
marks them `linguist-vendored` — and `cspell` and `markdownlint` both reach
`.agents/` because this repository's own 26 skills are documentation and are
spell-checked and markdown-linted like any other. That is the whole point of the
split: the vendored skills are owned upstream, so correcting their spelling or
reflowing their tables here would be a change this repository has no right to
make, while its own skills are held to the same standards as the rest of its
prose. All five list the skills one per line rather than excluding
`.agents/skills/` wholesale, so this repository's own skills in the same
directory keep being checked, measured, corrected, and attributed.
The entries are generated rather than hand-maintained: each file marks its block
with an `installed-skills-start` and an `installed-skills-end` comment in its
own syntax — `#` for the three ignore files and the cspell YAML, `//` for the
markdownlint JSONC — and the `skill-exclusions` synchronizer rewrites what sits
between them from the lockfile. `skill-exclusions` joins `lint-codebase` in the
same `nx affected` invocation, so a stale list fails there — which is what
`skills update` adding a skill would otherwise do silently:

```bash
pnpm exec nx run synchronization:skill-exclusions:write
```

Every other tool scopes itself with explicit globs that never include
`.agents/`.

Two details of that machinery are worth knowing before changing it:

- **A wholesale pattern defeats the whole arrangement**, and no check catches
  it. Re-adding `**/.agents/skills/**` outside a managed block leaves every
  per-skill entry in place while quietly taking this repository's own 26 skills
  back out of scope, and the synchronizer reports nothing because its own block
  still matches the lockfile. Exclude a vendored skill by name.
- **The root `project.json` mirrors the exclusions as cache negations.** Its
  `vendored-skills` named input drops the vendored skills from the `spell-check`
  and `markdown-lint` `inputs`, because a tool that ignores a file has no reason
  to rehash on it. They are a cache optimization rather than a correctness gate:
  a vendored skill with no negation merely over-invalidates, and one for a skill
  the lockfile has dropped only stops a file those tools do read from
  invalidating anything.

`scripts/install-skills.sh` restores the skill folders, run by the root
`postinstall` and by `codebase:install-skills`. It matters only when a folder is
genuinely absent — after `skills update` adds a new entry to the lockfile, or
when one has been deleted:

```bash
pnpm exec nx run codebase:install-skills
```

Four behaviors are worth knowing before changing any of this:

- **It is idempotent.** With every locked skill already on disk it returns in
  milliseconds instead of re-cloning every source repository. Use the `force`
  configuration to re-restore a skill that is present but damaged.
- **It never leaves tracked files dirty.** `skills experimental_install`
  rewrites `skills-lock.json` with whatever hash each source holds now, and
  rewrites every skill folder with whatever content its source holds now — one
  absent folder is enough to refresh every skill whose upstream has moved. The
  script reverts both. Otherwise every CI job would end with a dirty tree and
  `upgrade-dependencies.yml` — which gates its pull request on
  `git diff --quiet` — would open an empty upgrade pull request on every run.
  A skill the lockfile names but the repository has not committed is left as
  fetched, because git has nothing to return it to, and an edit to an installed
  copy is reported as discarded rather than silently replaced by upstream
  content.
- **It never fails an install.** Skills are agent context, not a build input, so
  a GitHub outage or rate limit prints a warning and the retry command rather
  than breaking `pnpm install` for everyone. A missing skill is a broken agent
  workflow, not a broken build.
- **Two escape hatches.** `SKIP_SKILLS_INSTALL=1` skips restoration entirely;
  `validate-conventions.yml` already bypasses it by installing with
  `--ignore-scripts`, since commitlint and validate-branch-name are all it
  needs.

Moving the pins forward is a separate job, owned by `skills update` — the
`🤹 Upgrade Skills` step in `upgrade-dependencies.yml` runs it weekly so hash
changes arrive as a reviewable dependency pull request:

```bash
pnpm exec skills update
```

### Agent Skills Configuration

The [mattpocock/skills](https://github.com/mattpocock/skills) engineering skills
read their per-repository configuration from `docs/agents/`. Edit these files
directly; re-run `/setup-matt-pocock-skills` only to switch issue trackers or
start over.

| Concern       | Setting                                                                       | Reference                                                      |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Issue tracker | GitHub Issues in `JimmyPaolini/codebase`, via the `gh` CLI                    | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage labels | The five canonical roles mapped onto this repository's `status:` label family | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Domain docs   | Single-context — one root `CONTEXT.md` plus root `docs/adr/`                  | [`docs/agents/domain.md`](docs/agents/domain.md)               |

`CONTEXT.md` and `docs/adr/` do not exist yet, and that is expected —
[domain-modeling](.agents/skills/domain-modeling/SKILL.md) creates them lazily as
terms and decisions actually get resolved. Do not scaffold them upfront.

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
- **This workspace has no `test` target.** The `nx-*` skills are installed from
  [nrwl/nx](https://github.com/nrwl/nx) and their examples use the conventional
  `nx run-many -t test`, which fails here. Read `test` as `vitest` — or
  `pytest` for a `language:python` project — and see
  [Testing](#testing) for the real target names.

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
