# Codebase Guidance

## Essential Commands

```bash
# Run tasks via Nx (always prefer this)
nx run <project>:<target>:<configuration>
nx run-many --target=lint --all
nx affected --target=test --base=main

# Install dependencies
pnpm add --filter <project> <package>
pnpm add -w <package>  # Workspace root

# Tools that run directly (not via Nx)
docker build --platform linux/amd64 -t myapp .
kubectl get pods
helm upgrade --install myrelease ./chart
```

## Agent Workflow

Use the [obra/superpowers](https://github.com/obra/superpowers) workflow for non-trivial features, refactors, and
bugfixes so the work is clarified, planned, tracked, and implemented in a
consistent way.

1. Start with [using-superpowers](.agents/skills/using-superpowers/SKILL.md)
   and move into [brainstorming](.agents/skills/brainstorming/SKILL.md)
   when the request needs clarification.
2. Turn the clarified request into a spec or implementation plan, then
   create the issue graph when the work spans multiple tasks.
3. Execute the plan with
   [subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)
   or [executing-plans](.agents/skills/executing-plans/SKILL.md),
   depending on whether subagents are available.
4. Follow [test-driven-development](.agents/skills/test-driven-development/SKILL.md)
   and finish with [validate-code](.agents/skills/validate-code/SKILL.md).

Use the reference document for the full workflow, anti-patterns, and skill
selection guidance.

## Projects

### Applications

- **[affirmations](applications/affirmations)**: Python Jupyter notebook application for LangChain + LangGraph affirmation generation (Ollama gemma4:e2b, ReAct agent, SearxNG metasearch with Trafilatura research processing)
- **[caelundas](applications/caelundas)**: Node.js CLI for astronomical calendar generation (NASA JPL API)
- **[JimmyPaolini](applications/JimmyPaolini)**: Portfolio website
- **[lexico](applications/lexico)**: SSR web app (React 19, TanStack Start)
- **[lexico-ingestion](applications/lexico-ingestion)**: NestJS CLI app for Latin dictionary data ingestion

### Packages

- **[lexico-components](packages/lexico-components)**: Shared React component library (shadcn/ui, Radix UI)
- **[lexico-entities](packages/lexico-entities)**: Shared TypeORM entities and GraphQL types package

### Tools

- **[conformetry-cli](packages/conformetry-cli)**: Command-line host for code generation and validation
- **[conformetry-nx](packages/conformetry-nx)**: Nx plugin that exposes the conformetry generator namespace
- **[synchronization](tools/synchronization)**: NestJS CLI for synchronizing codebase configuration and documentation artifacts

## Conformetry

The conformetry toolchain provides two workflows that should be used together:

- **Generators** create standardized project and module scaffolding from templates.
- **Validation** checks generated (and manually edited) files against those templates to keep structure and conventions consistent.

### Generation

Conformetry generators are declared in `configuration/conformetry.config.ts` and executed through the `@conformetry/nx` Nx plugin.

Use generators when creating new applications/modules/components so the initial file set, naming, and conventions are correct from the start.

```bash
nx generate conformetry:<generator-name> [options]
# or
nx g conformetry:<generator-name> [options]
```

The `conformetry` generator namespace is emitted from the configuration into
the gitignored `.conformetry/` directory on `pnpm install`, so it is never
committed. If Nx reports it is not installed, run `pnpm install` again. No
project is called `conformetry` — the name means the generator namespace and
nothing else, and the command-line host is `conformetry-cli`.

Prefer generator aliases for speed when you already know them (for example, `nsm`, `ngm`, `c`).
After scaffolding, implement domain-specific logic in the generated files rather than hand-crafting parallel structures.

The table below reflects the conformetry generator registry in `configuration/conformetry.config.ts`.

<!-- conformetry-generators-table start -->

| Generator                      | Alias | Description                                                                                                                       |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------- |
| `jupyter-notebook-application` | `jna` | Generate a Python Jupyter notebook application                                                                                    |
| `nestjs-command-module`        | `ncm` | Generate a NestJS command module with command, module, and unit test files                                                        |
| `nestjs-command-project`       | `nca` | Generate a NestJS command-line application using nest-commander                                                                   |
| `nestjs-dataloader-module`     | `ndm` | Generate a NestJS dataloader module with dataloader, types, and unit test files                                                   |
| `nestjs-graphql-application`   | `nga` | Generate a NestJS GraphQL API application                                                                                         |
| `nestjs-graphql-module`        | `ngm` | Generate a NestJS GraphQL module with resolver, entities, inputs, args, factories, service, types, constants, and unit test files |
| `nestjs-service-file`          | `nsf` | Generate NestJS service and unit test files                                                                                       |
| `nestjs-service-module`        | `nsm` | Generate a NestJS service module with module, service, types, constants, and unit test files                                      |
| `nestjs-service-project`       | `nsp` | Generate a NestJS service package template for internal workspace libraries                                                       |
| `react-component`              | `c`   | Generate a React component with test file                                                                                         |

<!-- conformetry-generators-table end -->

### Validation

Conformetry validation is run via the workspace wrapper target and returns a JSON result summary.
It evaluates selected projects against validator rules derived from the conformetry configuration.

```bash
pnpm nx run codebase:conformetry-validate
```

Use filters when you want targeted checks:

```bash
pnpm nx run codebase:conformetry-validate -- --projects=<project-a>,<project-b>
pnpm nx run codebase:conformetry-validate -- --rules=<rule-a>,<rule-b>
pnpm nx run codebase:conformetry-validate -- --projects=<project> --rules=<rule>
```

How validation works:

- By default, it validates all selected workspace projects using all configured rule names.
- Rules map to generator families (for example `nestjs-service-module`, `react-component`).
- A rule runs only where applicable based on project tags and discovered file patterns.
- Any failed rule causes the validator command to fail, which is intended for CI and pre-merge quality gates.

Use this flow for best results: generate with conformetry first, then run validation after custom edits to confirm the result still matches the repository's conformetry standards.

## Work Scope

- When coding or refactoring, focus on one project at a time, or for sufficiently large requests only one module/folder at a time.
- If a request spans multiple projects or scopes, complete the first project end-to-end before starting the next one.
- If the work is truly independent across projects, split it into separate subagents or separate passes so each agent stays project-scoped.
- Avoid mixing unrelated project changes in one context unless the task is explicitly orchestrating them.

## Code Quality

**Every coding agent MUST run the [validate-code skill](.agents/skills/validate-code/SKILL.md) before declaring any implementation task complete.** This is non-negotiable.

```bash
# Auto-fix all format, lint, and unused-code issues
pnpm exec nx affected --target=analyze-code --configuration=write --base=main

# Verify no issues remain — all checks must pass
pnpm exec nx affected --target=analyze-code --configuration=check --base=main
```

For new/untracked files not yet picked up by `nx affected`:

```bash
pnpm exec nx run <project>:analyze-code --configuration=write
pnpm exec nx run <project>:analyze-code --configuration=check
```

**Do not commit until both commands pass cleanly.** If they fail, use the [triage-submission skill](.agents/skills/triage-submission/SKILL.md) to diagnose and fix the errors.

**TypeScript type coverage rule:** For any touched TypeScript project that defines a `type-coverage` target, run both `typecheck` and `type-coverage` before declaring implementation complete. Passing `typecheck` alone is not sufficient when `type-coverage` is available.

**Never silence errors with disable comments or configuration changes.** Do not use `// eslint-disable`, `// eslint-disable-next-line`, `// @ts-ignore`, `// @ts-expect-error`, `/* eslint-disable */`, `nocheck`, or similar suppression comments to work around lint or type errors. Do not loosen TypeScript `compilerOptions` (e.g. enabling `skipLibCheck`, disabling `strict` flags) or add ESLint `ignores`/`rules` overrides to suppress specific errors. Instead, triage the root cause and fix the code. Suppression is only permitted when the user explicitly requests it.

See the [validate-code skill](.agents/skills/validate-code/SKILL.md) for the full validation workflow and per-tool fix guidance.

### Quality Tools

| Tool            | Description                                           | Config                                   | Docs                                                    |
| --------------- | ----------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- |
| `oxfmt`         | Formats TS/JS/JSON/MD files                           | `configuration/oxfmt.config.ts`          | [docs](https://oxc.rs/docs/guide/usage/formatter.html)  |
| `sqlfluff`      | Formats and lints SQL files                           | `configuration/pyproject.toml`           | [docs](https://docs.sqlfluff.com/)                      |
| `prettier`      | Supplementary formatter for manual or non-default use | `configuration/prettier.config.ts`       | [docs](https://prettier.io/docs/)                       |
| `eslint`        | Lints TS/JS and markdown with workspace rules         | project `eslint.config.ts`               | [docs](https://eslint.org/docs/latest/)                 |
| `oxlint`        | Fast TS/JS linting for workspace files                | `configuration/oxlint.config.ts`         | [docs](https://oxc.rs/docs/guide/usage/linter.html)     |
| `ruff`          | Formats and lints Python files                        | `configuration/pyproject.toml`           | [docs](https://docs.astral.sh/ruff/)                    |
| `tsc`           | Type-checks TypeScript                                | project `tsconfig.json`                  | [docs](https://www.typescriptlang.org/docs/)            |
| `type-coverage` | Enforces TypeScript type-coverage gates               | root `tsconfig.json`                     | [docs](https://github.com/plantain-00/type-coverage)    |
| `pyright`       | Performs static Python type checking                  | `configuration/pyproject.toml`           | [docs](https://github.com/microsoft/pyright)            |
| `ty`            | Performs additional Python type checking              | `configuration/pyproject.toml`           | [docs](https://docs.astral.sh/ty/)                      |
| `knip`          | Finds unused TS/JS files, exports, and dependencies   | `configuration/knip.config.ts`           | [docs](https://knip.dev/)                               |
| `vulture`       | Finds unused Python code                              | `configuration/vulture_whitelist.py`     | [docs](https://github.com/jendrikseipp/vulture)         |
| `fallow`        | Analyzes dead code, duplication, and code health      | `configuration/fallow.config.jsonc`      | [docs](https://docs.fallow.tools/)                      |
| `jscpd`         | Detects duplicated code and copy-paste patterns       | `configuration/jscpd.config.json`        | [docs](https://jscpd.dev/)                              |
| `cspell`        | Checks spelling across code and documentation         | `configuration/cspell.config.yaml`       | [docs](https://cspell.org/)                             |
| `markdownlint`  | Lints markdown files                                  | `configuration/.markdownlint-cli2.jsonc` | [docs](https://github.com/DavidAnson/markdownlint-cli2) |
| `yamllint`      | Lints YAML files                                      | `configuration/yamllint.yaml`            | [docs](https://yamllint.readthedocs.io/)                |

## Git Workflow

**Never bypass git hooks** with `--no-verify` — fix the underlying issue instead.

**Do not run signing-check scripts manually in normal commit/push flows.** Husky already runs `scripts/git/check-commit-signing-configuration.sh` in pre-commit and `scripts/git/check-push-commit-signatures.sh` in pre-push.

**Never suppress lint or type errors** with disable comments (`eslint-disable`, `@ts-ignore`, `@ts-expect-error`, `nocheck`) or by loosening configuration — triage and fix the code instead. Suppression is only permitted when the user explicitly requests it.

### Git Worktrees

- When asked to create a Git worktree, derive or reuse a branch name that follows `<type>/<scope>-<description>`.
- Validate the candidate branch first with `pnpm exec validate-branch-name -t "<branch-name>"`.
- Prefer `bash .agents/skills/create-worktree/scripts/create-worktree.sh "<branch-name>" [base-branch] [worktree-path]` over raw `git worktree add`.
- Default the worktree path to `../codebase-worktrees/<branch-name-with-slashes-replaced-by-hyphens>` unless the user requests a different path.
- If the branch already exists locally, attach a worktree to it instead of creating a second branch.

### Branch Names

Format: `<type>/<scope>-<description>` — all three parts required, kebab-case description.

Examples: `feat/lexico-user-auth`, `fix/caelundas-timezone-bug`, `docs/codebase-architecture`

Special branches exempt from naming convention: `main`, `develop`, `renovate/*`, `dependabot/*`

### Commit Messages

Format: `<type>(<scope>): <gitmoji> <subject>` — single line only, max 128 chars.

- **Gitmoji required** at the start of the subject line
- **Body and footer are forbidden** — all context goes in the subject or PR description
- Subject: lowercase, imperative mood, no period
- Never list multiple changes — summarize at a higher level or split into separate commits

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` · 🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

Examples:

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
chore(dependencies): ⬆️ upgrade react to v19
docs(codebase): 📝 update contributing guide
```

### Pull Requests

PR title follows the same format as commit messages: `<type>(<scope>): <gitmoji> <subject>`

PR description template:

```markdown
## 🌰 Summary

<!-- Brief description of what this PR does (1-2 sentences) -->

## 📝 Details

- <!-- List of specific changes made -->

## 🧪 Testing

1. <!-- How to manually verify these changes work correctly -->

## 🔗 Related

- <!-- Link any relevant issues or documentation -->
```

### Conventional Naming

#### Types

<!-- types-start -->

| Type       | Description                                                                         |
| ---------- | ----------------------------------------------------------------------------------- |
| `feat`     | A new feature or capability that adds value for users                               |
| `fix`      | A bug fix that addresses a specific issue or problem                                |
| `docs`     | Documentation, AGENTS.md, SKILL.md, README, and planning files                      |
| `test`     | Adding or correcting unit, integration, or end-to-end tests                         |
| `refactor` | Code restructuring that neither fixes a bug nor adds a feature                      |
| `style`    | Formatting, whitespace, or code structure changes with no semantic effect           |
| `perf`     | A code change that improves performance (caching, query optimization, etc.)         |
| `chore`    | Housekeeping that doesn't modify src or test files (gitignore, editor config, etc.) |
| `ci`       | GitHub Actions workflows, composite actions, and CI/CD scripts                      |
| `build`    | Build system, Vite/Docker/Helm config, or external dependency integration           |
| `revert`   | Reverts a previous commit                                                           |

<!-- types-end -->

#### Scopes

<!-- scopes-start -->

| Scope               | Description                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| `affirmations`      | Python Jupyter notebook application for LangGraph affirmation generation               |
| `applications`      | Changes spanning multiple applications in applications/ (e.g. lexico, caelundas, etc.) |
| `caelundas`         | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris)                  |
| `configuration`     | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.)                  |
| `conformetry`       | Code generator templates and validation tests for generated instances                  |
| `dependencies`      | Dependency version changes (upgrades, additions, removals via pnpm)                    |
| `deps`              | Dependency version changes (upgrades, additions, removals via pnpm)                    |
| `deployments`       | GitHub Actions workflows and CI/CD pipeline configuration                              |
| `documentation`     | Markdown docs, skills, planning files, and AGENTS.md files                             |
| `infrastructure`    | Helm charts, Terraform configs, and Kubernetes resources                               |
| `JimmyPaolini`      | Static GitHub profile README project (markdown and assets)                             |
| `lexico`            | TanStack Start SSR Latin dictionary web app with Supabase backend                      |
| `lexico-components` | Shared React/shadcn component library                                                  |
| `lexico-entities`   | Shared TypeORM entities and GraphQL types                                              |
| `lexico-ingestion`  | Data ingestion scripts for Lexico                                                      |
| `codebase`          | Workspace root concerns (pnpm-workspace, root package.json, Nx orchestration)          |
| `no-release`        | Escape hatch: suppress semantic-release for any commit type                            |
| `packages`          | Changes spanning multiple shared packages in packages/                                 |
| `release`           | Version bumps and release commits generated by semantic-release                        |
| `scripts`           | Shell and TypeScript scripts in scripts/ (sync, setup, utilities)                      |
| `testing`           | Vitest configuration, shared test utilities, and coverage setup                        |
| `tools`             | Changes spanning multiple tool projects in tools/                                      |
| `synchronization`   | Synchronization application and commands for automating workflows                      |

<!-- scopes-end -->

## Key Conventions

### Abbreviations

- **No Acronyms or Abbreviations**: Never use acronyms or abbreviations for variable names, function names, parameters, etc.
- Use explicit and unabbreviated names (e.g. `request` instead of `req`, `response` instead of `res`, `index` instead of `i`, `error` instead of `e`).
- **Exceptions**: Abbreviations are acceptable when avoiding language reserved word collisions (e.g., using `args` instead of `arguments`, `str` instead of `string`).
- Abbreviation rules are enforced by ESLint (`unicorn/prevent-abbreviations`) and CSpell (`flagWords`).

### File Naming

- **Kebab-case**: All file names must be lowercase with hyphens separating words (e.g., `my-file-name.ts`).
- **Always** prefer service files `*.service.ts` over `*.ts` or `*.utilities.ts` for NestJS service classes.
- Only use utilities files `*.utilities.ts` in cases where a top level function is needed, and only use them to invoke service class methods or to compose multiple service class methods together. Never use utilities files to implement business logic directly.

### Project Tags

- **`language:typescript`** — applied to all TypeScript projects (caelundas, lexico, lexico-components, conformetry packages, codebase)
- **`language:python`** — applied to all Python projects (affirmations)

These tags enable conditional sub-target composition in composite targets (`format`, `lint`, `typecheck`, `test`). Python projects override the TS-default composite targets to compose Python sub-targets (`ruff-format`, `ruff-lint`, `pyright`, `pytest`) instead of TS ones.

See [Python Conventions](documentation/conventions/python.md) for the full Python tooling setup.

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
- **Section comments**: Use `// 🎯 Section name` (emoji + capitalized name). Never use dash lines or ASCII art dividers. See [write-comment skill](.agents/skills/write-comment/SKILL.md).
- **NestJS class file shape**: In `*.service.ts`, `*.command.ts`, `*.resolver.ts`, `*.dataloader.ts`, and `*.module.ts`, keep only imports and the class at top level. Move helper types/interfaces to `*.types.ts`, constants to `*.constants.ts`, and never use alias or type re-exports from class files.

See [TypeScript Conventions](documentation/conventions/typescript.md) for strict mode patterns.

### Testing

- **Unit** (`*.unit.test.ts`): Pure functions, mocked I/O, fast (< 100ms)
- **Integration** (`*.integration.test.ts`): Database/API, real I/O, moderate (1-2s)
- **End-to-end** (`*.end-to-end.test.ts`): Full workflows, real services, slow (30-60s)

```bash
nx run <project>:test:unit        # Fast feedback
nx run <project>:test:integration # Database validation
nx affected --target=test         # Only changed projects
```

See [Testing Strategy](documentation/code-quality/testing-strategy.md) for patterns.

## Agent Context

### Instructions

Guidelines for creating custom instruction files, skills, agents, and prompts for GitHub Copilot. See [`.github/instructions/`](.github/instructions) for actual implementations:

- `agent-skills.instructions.md`: Structure and format for skill files
- `agents.instructions.md`: Building specialized agent workflows
- `instructions.instructions.md`: Writing context-specific guidance
- `prompt.instructions.md`: Designing reusable prompt templates

### Skills

Specialized domain knowledge for working on specific systems or patterns:

<!-- agent-skills-table-of-contents start -->

- **[backup-code](.agents/skills/backup-code/SKILL.md)**: "Create a safety backup before potentially destructive actions. Use when running risky git commands (reset, rebase, clean, restore, checkout with overwrite, force push), applying large sweeping edits, mass refactors, broad search-and-replace, generator rewrites, or any operation that may be hard to undo. Produces a recoverable snapshot via backup branch, stash, or both, and verifies recovery commands."
- **[brainstorming](.agents/skills/brainstorming/SKILL.md)**: "You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation."
- **[checkout-branch](.agents/skills/checkout-branch/SKILL.md)**: Create and validate Git branch names following this codebase's Conventional Commits naming convention. Use this skill when creating branches, renaming branches, or when asked about branch naming rules and validation.
- **[commit-code](.agents/skills/commit-code/SKILL.md)**: Write commit messages following this codebase's Conventional Commits standard with Gitmoji support. Use this skill when creating commits or when asked about commit message formatting.
- **[create-pull-request](.agents/skills/create-pull-request/SKILL.md)**: Create and manage pull requests following this codebase's conventions. Use this skill when creating PRs, opening PRs for review, writing PR descriptions, or asked about PR workflows and best practices.
- **[create-worktree](.agents/skills/create-worktree/SKILL.md)**: Create or attach git worktrees that follow this codebase's branch naming conventions. Use when asked to create a worktree, derive a compliant branch name, validate a branch name before worktree creation, choose a worktree path, or avoid raw `git worktree add` commands.
- **[dispatching-parallel-agents](.agents/skills/dispatching-parallel-agents/SKILL.md)**: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
- **[executing-plans](.agents/skills/executing-plans/SKILL.md)**: Use when you have a written implementation plan to execute in a separate session with review checkpoints
- **[explore-codebase](.agents/skills/explore-codebase/SKILL.md)**: "Explore codebase files, patterns, and structure for a given topic. USE WHEN gathering implementation context before planning or executing tasks, when asked to research the codebase, or when a planning agent needs a Sub-Agent A (Codebase Research). Returns a Codebase Research Summary with relevant files, existing patterns, affected Nx projects, reusable code, related plans, constraints, and open questions."
- **[explore-internet](.agents/skills/explore-internet/SKILL.md)**: "Gather external documentation, changelogs, and release notes for libraries, frameworks, and APIs. USE WHEN a plan involves external dependencies, package upgrades, migrations, new frameworks, or technologies requiring documentation lookup. Skip for purely internal refactoring. Returns an External Research Summary with breaking changes, migration guidance, known issues, and documentation links."
- **[finishing-a-development-branch](.agents/skills/finishing-a-development-branch/SKILL.md)**: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work
- **[gh-stack](.agents/skills/gh-stack/SKILL.md)**: >
- **[github-actions](.agents/skills/github-actions/SKILL.md)**: Build and test GitHub Actions workflows in this codebase. Covers the composite action pattern and workflow templates. Use this skill when creating, modifying, or testing GitHub Actions workflows.
- **[github-issues](.agents/skills/github-issues/SKILL.md)**: 'Create, update, and manage GitHub issues using MCP tools. Use this skill when users want to create bug reports, feature requests, or task issues, update existing issues, add labels/assignees/milestones, set issue fields (dates, priority, custom fields), set issue types, manage issue workflows, link issues, add dependencies, or track blocked-by/blocking relationships. Triggers on requests like "create an issue", "file a bug", "request a feature", "update issue X", "set the priority", "set the start date", "link issues", "add dependency", "blocked by", "blocking", or any GitHub issue management task.'
- **[handle-errors](.agents/skills/handle-errors/SKILL.md)**: "Apply codebase error handling patterns: Zod validation at boundaries, typed errors, early returns, and retry/backoff. Use when implementing error handling or input validation."
- **[impeccable](.agents/skills/impeccable/SKILL.md)**: Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize, adapt, animate, colorize, extract, or otherwise improve a frontend interface. Covers websites, landing pages, dashboards, product UI, app shells, components, forms, settings, onboarding, and empty states. Handles UX review, visual hierarchy, information architecture, cognitive load, accessibility, performance, responsive behavior, theming, anti-patterns, typography, fonts, spacing, layout, alignment, color, motion, micro-interactions, UX copy, error states, edge cases, i18n, and reusable design systems or tokens. Also use for bland designs that need to become bolder or more delightful, loud designs that should become quieter, live browser iteration on UI elements, or ambitious visual effects that should feel technically extraordinary. Not for backend-only or non-UI tasks.
- **[learn-lessons](.agents/skills/learn-lessons/SKILL.md)**: 'Retrospective skill that analyzes a coding agent session, a set of local changes, or a branch/pull request, then extracts reusable coding patterns, architectural decisions, and best practices — and writes them into skills and AGENTS.md so future agents apply the same patterns automatically. Primary use: capturing HOW code was written (naming, structure, TypeScript idioms, module patterns, error handling), not just what the agent did. Use when asked to "learn from this session", "capture patterns from this PR", "remember how we did this", "document this approach", "improve skills from this work", or "make sure future agents do it this way".'
- **[link-workspace-packages](.agents/skills/link-workspace-packages/SKILL.md)**: 'Link workspace packages in codebases (npm, yarn, pnpm, bun). USE WHEN: (1) you just created or generated new packages and need to wire up their dependencies, (2) user imports from a sibling package and needs to add it as a dependency, (3) you get resolution errors for workspace packages (@org/\*) like "cannot find module", "failed to resolve import", "TS2307", or "cannot resolve". DO NOT patch around with tsconfig paths or manual package.json edits - use the package manager''s workspace commands to fix actual linking.'
- **[monitor-ci](.agents/skills/monitor-ci/SKILL.md)**: Monitor Nx Cloud CI pipeline and handle self-healing fixes. USE WHEN user says "monitor ci", "watch ci", "ci monitor", "watch ci for this branch", "track ci", "check ci status", wants to track CI status, or needs help with self-healing CI fixes. Prefer this skill over native CI provider tools (gh, glab, etc.) for CI monitoring — it integrates with Nx Cloud self-healing which those tools cannot access.
- **[nx-generate](.agents/skills/nx-generate/SKILL.md)**: Generate code using nx generators. INVOKE IMMEDIATELY when user mentions scaffolding, setup, structure, creating apps/libs, or setting up project structure. Trigger words - scaffold, setup, create a new app, create a new lib, project structure, generate, add a new project. ALWAYS use this BEFORE calling nx_docs or exploring - this skill handles discovery internally.
- **[nx-import](.agents/skills/nx-import/SKILL.md)**: Import, merge, or combine repositories into an Nx workspace using nx import. USE WHEN the user asks to adopt Nx across repos, move projects into a codebase, or bring code/history from another repository.
- **[nx-plugins](.agents/skills/nx-plugins/SKILL.md)**: Find and add Nx plugins. USE WHEN user wants to discover available plugins, install a new plugin, or add support for a specific framework or technology to the workspace.
- **[nx-run-tasks](.agents/skills/nx-run-tasks/SKILL.md)**: Helps with running tasks in an Nx workspace. USE WHEN the user wants to execute build, test, lint, serve, or run any other tasks defined in the workspace.
- **[nx-workspace](.agents/skills/nx-workspace/SKILL.md)**: "Explore and understand Nx workspaces. USE WHEN answering questions about the workspace, projects, or tasks. ALSO USE WHEN an nx command fails or you need to check available targets/configuration before running a task. EXAMPLES: 'What projects are in this workspace?', 'How is project X configured?', 'What depends on library Y?', 'What targets can I run?', 'Cannot find configuration for task', 'debug nx task failure'."
- **[prompt-implementation](.agents/skills/prompt-implementation/SKILL.md)**: Use when preparing a kickoff prompt for a fresh coding agent to implement a feature from superpowers-generated specs/plans and GitHub issue graphs, especially when tasks are linked by parent/sub-issue and blocked-by dependencies.
- **[query-sql](.agents/skills/query-sql/SKILL.md)**: Toolkit for interactively querying and exploring the local PostgreSQL database schema and data using the local psql client. Use when asked to write a SQL query, explore database schemas, inspect table structures, or execute local database queries. Relies on workspace default environment variables.
- **[receiving-code-review](.agents/skills/receiving-code-review/SKILL.md)**: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
- **[refresh-documentation](.agents/skills/refresh-documentation/SKILL.md)**: Review and update all project documentation to keep it accurate and current. Use this skill when asked to refresh, update, or audit documentation, README files, AGENTS.md files, skill descriptions, or any markdown docs across the codebase.
- **[rename-branch](.agents/skills/rename-branch/SKILL.md)**: "Rename a git branch. Analyzes changes against the main branch, decides on a conventional name, and executes the rename."
- **[requesting-code-review](.agents/skills/requesting-code-review/SKILL.md)**: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
- **[resolve-conflicts](.agents/skills/resolve-conflicts/SKILL.md)**: Workflow to resolve Git merge conflicts cleanly. Use when asked to resolve conflicts, fix merge issues, merge a branch, or rebase with conflicts. This skill instructs the agent to analyze both branches to understand their distinct purposes before resolving conflicts to preserve the intent of both.
- **[restore-code](.agents/skills/restore-code/SKILL.md)**: "Restore code safely from backup artifacts created before risky changes. Use when undoing destructive operations, recovering from failed refactors or rebases, restoring deleted files, rolling back broad search-and-replace edits, or rehydrating work from backup branches and stashes. Supports preview-first recovery via backup branch, stash, or selective file restoration."
- **[seed-postgres](.agents/skills/seed-postgres/SKILL.md)**: "Use this skill to dump and restore local PostgreSQL databases, schemas, and tables (collections) using Nx targets and pg_dump/pg_restore. Use when asked to backup, dump, export, restore, import, or copy local database data."
- **[sign-commits](.agents/skills/sign-commits/SKILL.md)**: Re-sign unsigned commits on the current branch or pull request without changing code content by rewriting only from the first unsigned commit onward on a temporary branch. Use when asked to sign commits, add GPG signatures to an existing branch, satisfy signed-commit requirements, or make a PR show verified commits. Creates a backup branch first, runs the rebase non-interactively, verifies the rewritten final tree exactly matches the original branch tip, and stops immediately if any check, conflict, drift, or GPG step fails.
- **[spell-check](.agents/skills/spell-check/SKILL.md)**: Run and triage cspell in this codebase. Use when spell-check fails in lint-staged, nx affected, or nx run-many, when cspell reports Unknown word entries, or when adding domain vocabulary to the correct dictionary under configuration/.cspell. Covers full-workspace checks, project-targeted checks, and dictionary update validation.
- **[stay-awake](.agents/skills/stay-awake/SKILL.md)**: Use when running long coding-agent sessions on macOS that risk idle sleep, especially when tests, builds, debugging, or CI triage may outlast display or system sleep timers, when starting implementation from a superpowers plan or similar long-running task, or when the user says "caffeinate yourself".
- **[subagent-driven-development](.agents/skills/subagent-driven-development/SKILL.md)**: Use when executing implementation plans with independent tasks in the current session
- **[submit-changes](.agents/skills/submit-changes/SKILL.md)**: Automatically submit local changes through the full branch → commit → push → pull request pipeline. Includes branch-name conformance checks and automatic branch rename when needed. Use this skill when asked to submit, ship, or push changes; when you want to move from local changes to an open PR in one step; or when orchestrating the complete git workflow automatically without manual steps.
- **[systematic-debugging](.agents/skills/systematic-debugging/SKILL.md)**: Use when encountering any bug, test failure, or unexpected behavior, before proposing fixes
- **[test-driven-development](.agents/skills/test-driven-development/SKILL.md)**: Use when implementing any feature or bugfix, before writing implementation code
- **[testing-mocks](.agents/skills/testing-mocks/SKILL.md)**: Create and structure mocks for tests using createMock, vi.mock, and NestJS DI patterns. USE WHEN writing unit or integration tests with mocked dependencies, when asked about mocking services or repositories, or when setting up test environments with injected dependencies.
- **[testing-strategy](.agents/skills/testing-strategy/SKILL.md)**: "Use codebase testing conventions: unit, integration, end-to-end test naming and Nx commands. Use when adding tests or recommending test coverage."
- **[triage-deployment](.agents/skills/triage-deployment/SKILL.md)**: "Diagnose and fix failing GitHub Actions CI workflows in this codebase. Use when a CI check fails on a pull request or push, when you see red checks in GitHub Actions, when asked to fix CI, debug a workflow failure, or investigate a failing job. Accepts logs pasted directly in chat OR retrieves them automatically via the gh CLI. Triages failures for: analyze-code (typecheck, lint, format, spell-check, knip, markdown-lint, yaml-lint), test-coverage, validate-conventions (branch name, PR title/body, config sync), audit-security (gitleaks, bandit, scan-dependencies, trivy), and make-devcontainer (VSCode extensions sync, Docker build, devcontainer test)."
- **[triage-submission](.agents/skills/triage-submission/SKILL.md)**: "Triage and fix git submission failures for both commits and pushes. Use when a git commit or push is rejected, when lint-staged errors occur, when pre-commit or pre-push hooks fail, when a branch name is invalid on push, or when you see errors from husky, commitlint, validate-branch-name, ESLint, oxfmt, prettier, typecheck, knip, cspell, markdownlint, or yamllint during a commit or push attempt. Reads the error output, identifies the failing hook and checks, reads the relevant configuration, and applies targeted fixes."
- **[update-pull-request](.agents/skills/update-pull-request/SKILL.md)**: Update an existing pull request's title and description to accurately reflect the implemented changes. Use this skill when asked to update, refresh, or rewrite a PR title or description, sync a PR with the latest changes, or when the PR description no longer matches the implementation.
- **[upsert-issues](.agents/skills/upsert-issues/SKILL.md)**: Use when converting implementation plans into many linked GitHub issues, or when creating/updating issue hierarchies with parent-sub-issue and dependency relationships plus consistent metadata.
- **[using-git-worktrees](.agents/skills/using-git-worktrees/SKILL.md)**: Use when starting feature work that needs isolation from current workspace or before executing implementation plans - ensures an isolated workspace exists via native tools or git worktree fallback
- **[using-superpowers](.agents/skills/using-superpowers/SKILL.md)**: Use when starting any conversation - establishes how to find and use skills, requiring skill invocation before ANY response including clarifying questions
- **[validate-code](.agents/skills/validate-code/SKILL.md)**: Run the full code quality validation suite for this codebase. Use this skill when you have finished implementing code changes and want to verify they are clean before committing, when told to "validate", "check quality", or "run linting", or before invoking the submit-changes skill. Runs analyze-code (format, lint, typecheck, knip, spell-check) using the write configuration to auto-fix what it can, then checks that nothing remains.
- **[verification-before-completion](.agents/skills/verification-before-completion/SKILL.md)**: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
- **[write-comments](.agents/skills/write-comments/SKILL.md)**: Apply codebase commenting conventions for TypeScript, Python, and any language. USE WHEN writing or reviewing comments, adding section comments, organizing code into logical groups, or asked about comment style. Covers when to comment, how to write good comments, section comment format (emoji + capitalized name), emoji reference table, and anti-patterns to avoid (obvious comments, redundant JSDoc, TODO lint bypasses, dash-line dividers).
- **[write-python](.agents/skills/write-python/SKILL.md)**: Python project conventions for this codebase. Use when creating a new Python project, configuring Python tools (ruff, pyright, ty, pytest, bandit, vulture), writing or reviewing pyproject.toml, setting up Nx targets for Python, or asked about Python tooling setup, uv, or the language:python tag. Covers the project.json pattern, pyproject.toml structure, targetDefaults, tool execution via uv run, and ty pre-1.0 configuration rules.
- **[write-react](.agents/skills/write-react/SKILL.md)**: React coding conventions for this codebase. Use when writing or reviewing React components, when asked about component structure, section ordering, Tailwind CSS usage, state management patterns, conditional rendering, list rendering, or React 19 conventions. Covers component section layout (🔖🧩🪝🏗💪🏁🎨), Tailwind CSS with theme tokens, TanStack Router file-based routing, lexico-components usage, and testing with Vitest + RTL.
- **[write-typescript](.agents/skills/write-typescript/SKILL.md)**: TypeScript coding conventions for this codebase. Use when writing or modifying TypeScript or TSX files, when TypeScript type errors appear, or when asked about strict mode, type imports, naming conventions, return types, the no-any rule, async functions, floating promises, exhaustive switches, readonly properties, non-null assertions, control-flow style, test typing patterns, or Node fs Dirent mock typing.
- **[writing-plans](.agents/skills/writing-plans/SKILL.md)**: Use when you have a spec or requirements for a multi-step task, before touching code
- **[writing-skills](.agents/skills/writing-skills/SKILL.md)**: Use when creating new skills, editing existing skills, or verifying skills work before deployment
<!-- agent-skills-table-of-contents end -->

### Agents

<!-- custom-agents-table-of-contents start -->

- **[ci-monitor-subagent](.github/agents/ci-monitor-subagent.agent.md)**: CI helper for /monitor-ci. Fetches CI status, retrieves fix details, or updates self-healing fixes. Executes one MCP tool call and returns the result.
- **[explore-codebase](.github/agents/explore-codebase.agent.md)**: Explore codebase files, patterns, and structure for a given topic. USE WHEN gathering implementation context before planning or executing tasks, when asked to research the codebase, or when a planning agent needs a Sub-Agent A (Codebase Research). Returns a Codebase Research Summary with relevant files, existing patterns, affected Nx projects, reusable code, related plans, constraints, and open questions.
- **[explore-internet](.github/agents/explore-internet.agent.md)**: Gather external documentation, changelogs, and release notes for libraries, frameworks, and APIs. USE WHEN a plan involves external dependencies, package upgrades, migrations, new frameworks, or technologies requiring documentation lookup. Skip for purely internal refactoring. Returns an External Research Summary with breaking changes, migration guidance, known issues, and documentation links.
- **[triage-deployment](.github/agents/triage-deployment.agent.md)**: Diagnose and fix failing GitHub Actions CI workflows in this codebase. Use when a CI check fails on a pull request or push, when you see red checks in GitHub Actions, when asked to fix CI, debug a workflow failure, or investigate a failing job. Accepts logs pasted directly in chat OR retrieves them automatically via the gh CLI. Triages failures for: analyze-code (typecheck, lint, format, spell-check, knip, markdown-lint, yaml-lint), test-coverage, validate-conventions (branch name, PR title/body, config sync), audit-security (gitleaks, bandit, scan-dependencies, trivy), and make-devcontainer (VSCode extensions sync, Docker build, devcontainer test).
- **[triage-submission](.github/agents/triage-submission.agent.md)**: Triage and fix git submission failures for both commits and pushes. Use when a git commit or push is rejected, when lint-staged errors occur, when pre-commit or pre-push hooks fail, when a branch name is invalid on push, or when you see errors from husky, commitlint, validate-branch-name, ESLint, oxfmt, prettier, typecheck, knip, cspell, markdownlint, or yamllint during a commit or push attempt. Reads the error output, identifies the failing hook and checks, reads the relevant configuration, and applies targeted fixes.
<!-- custom-agents-table-of-contents end -->

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

<!-- OPENWIKI:START -->

## OpenWiki

This repository uses OpenWiki for recurring code documentation. Start with `openwiki/quickstart.md`, then follow its links to architecture, workflows, domain concepts, operations, integrations, testing guidance, and source maps.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->
