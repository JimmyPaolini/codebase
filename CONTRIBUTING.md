# Contributing to Codebase

Thank you for contributing! This guide covers the development workflow, code standards, and release process.

[AGENTS.md](AGENTS.md) is the deeper reference for conventions, project layout, and the toolchains this repository publishes. This guide is the shorter path: what to install, what to run, and what the checks will reject.

## Table of Contents

- [Contributing to Codebase](#contributing-to-codebase)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Option 1: Local Setup (macOS, Recommended)](#option-1-local-setup-macos-recommended)
    - [Option 2: Dev Container](#option-2-dev-container)
    - [Workspace Structure](#workspace-structure)
  - [Development Workflow](#development-workflow)
    - [Basic Commands](#basic-commands)
    - [The Gates](#the-gates)
  - [Code Standards](#code-standards)
    - [Size Limits](#size-limits)
    - [Coverage Gates](#coverage-gates)
  - [Git Hooks (Husky)](#git-hooks-husky)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [Commit Guidelines](#commit-guidelines)
    - [Types](#types)
    - [Scopes](#scopes)
  - [Release Significance](#release-significance)
  - [Pull Request Process](#pull-request-process)
  - [Release Process](#release-process)
  - [Code Ownership](#code-ownership)
  - [Environment Variables](#environment-variables)
    - [Root (`.env.default`)](#root-envdefault)
    - [caelundas (`applications/caelundas/.env.default`)](#caelundas-applicationscaelundasenvdefault)
  - [Dependency Update Workflow](#dependency-update-workflow)
  - [Additional Resources](#additional-resources)
  - [Getting Help](#getting-help)
  - [License](#license)

## Getting Started

### Option 1: Local Setup (macOS, Recommended)

The fastest way to get started on macOS is the setup script, which installs every required tool via Homebrew and then installs project dependencies.

**Prerequisites:**

- **macOS** with [Homebrew](https://brew.sh/) installed
- **Git**: Latest stable version
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required for the SearxNG, Open WebUI, and caelundas containers

**Setup:**

```bash
git clone https://github.com/JimmyPaolini/codebase.git
```

```bash
cd codebase && bash scripts/local/setup.sh
```

The script runs four stages in order, each sourced so that shell changes carry forward:

| Stage | Script                          | What it does                                                    |
| ----- | ------------------------------- | --------------------------------------------------------------- |
| 1     | `scripts/utilities.sh`          | Validates the working directory, loads `.env`, enables `set -e` |
| 2     | `scripts/local/software.sh`     | Installs system tools and configures the shell                  |
| 3     | `scripts/local/environment.sh`  | Creates `.env` files from `.env.default` templates              |
| 4     | `scripts/local/dependencies.sh` | Runs `pnpm install`, `uv sync`, and Terraform setup             |

**What gets installed:**

- **Node.js** toolchain — `nvm`, the Node version pinned in `.nvmrc`, and `pnpm`
- **Python** toolchain — `uv` plus the Python it manages
- **Ollama**, and it pulls the `gemma4:e2b` model the affirmations ReAct agent uses
- **PostgreSQL** for local database work
- **GnuPG** and `pinentry-mac`, because commits must be signed
- **Infrastructure and quality tools** — `gitleaks`, `terraform`, `trivy`, `supabase`, `jq`, `gh`, `helm`, `kubectl`

Stage 3 copies `.env.default` to `.env` for the workspace root and for **every** project that ships a template — existing `.env` files are never overwritten. It also appends `LOCAL_WORKSPACE_FOLDER` to the root `.env` so `docker-compose` volume mounts resolve.

Setup prints a version summary at the end. If a tool is missing from it, re-run the script rather than installing by hand.

### Option 2: Dev Container

Alternatively, use the included dev container for a fully configured environment (useful for Codespaces or when you prefer container isolation).

**Prerequisites:**

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine on Linux)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

**Setup:**

1. Clone the repository: `git clone https://github.com/JimmyPaolini/codebase.git`
2. Open the folder in VS Code
3. Open the command palette (`Ctrl/Cmd+Shift+P`) → **Dev Containers: Reopen in Container**
4. Select a configuration when prompted:
   - **Codebase Devcontainer (Local)** — local machine, Docker-outside-of-Docker (recommended)
   - **Codebase Devcontainer (Cloud)** — GitHub Codespaces or when full Docker isolation is needed, Docker-in-Docker
5. Wait for the container build (~2-3 minutes first time)
6. Start developing!

**Included Tools:**

| Tool         | Version                     | Purpose                                                      |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| Node.js      | 24.16.0                     | JavaScript runtime                                           |
| pnpm         | 11.2.2                      | Package manager                                              |
| Terraform    | latest                      | Infrastructure provisioning (Linode)                         |
| kubectl      | latest                      | Kubernetes cluster management                                |
| Helm         | latest                      | Kubernetes package manager                                   |
| GitHub CLI   | latest                      | Repository operations                                        |
| Supabase CLI | latest                      | Local Supabase stack and migrations for lexico               |
| Docker       | DooD (local) / DinD (cloud) | Docker-outside-of-Docker on local; Docker-in-Docker in cloud |

The repository pins Node through both `.nvmrc` and `.node-version`, and `package.json` declares `engines.node` to match. `.nvmrc` is declarative and only takes effect after running `nvm use`, or after enabling automatic `nvm` directory switching in your shell. Use the pinned version — newer Node majors have broken this repository's commit hooks in ways that are hard to read from the error output.

pnpm is pinned by `packageManager` in the root `package.json`, so Corepack selects the right version on its own.

**Port Forwarding:**

| Port  | Service            | Auto-Forward |
| ----- | ------------------ | ------------ |
| 3000  | Lexico Dev Server  | Notify       |
| 3001  | Open WebUI         | Notify       |
| 8889  | SearxNG            | Notify       |
| 11434 | Ollama API         | Silent       |
| 54321 | Supabase API       | Silent       |
| 54322 | Supabase Database  | Silent       |
| 54323 | Supabase Studio    | Notify       |
| 54324 | Supabase Email     | Silent       |
| 54325 | Supabase Analytics | Silent       |

See [.devcontainer/README.md](.devcontainer/README.md) for detailed configuration and troubleshooting.

### Workspace Structure

```text
codebase/
├── applications/       # Deployable applications (6)
├── packages/           # Shared libraries and toolchain packages (43)
├── tools/              # Repository-internal CLIs (2)
├── configuration/      # Every shared tool config, plus the Husky hooks
├── docs/               # Architecture decision records and agent configuration
├── documentation/      # Development guides and planning notes
├── openwiki/           # Generated code documentation — do not hand-edit
├── infrastructure/     # Docker, Helm charts, Terraform
├── scripts/            # Setup, git, and utility scripts
└── .agents/skills/     # Agent skills; every other agent entrypoint symlinks here
```

Every project lives in `applications/`, `packages/`, or `tools/` — a file directly in one of those directories is a lint error, not a style preference. The full annotated project list is in [AGENTS.md](AGENTS.md#projects), and [README.md](README.md) carries the same table, kept in step by the `check-readme-projects` target.

Scaffold new projects, modules, and components with a conformetry generator rather than by hand; code written in a shape a template already describes starts life failing conformance.

```bash
pnpm exec nx g conformetry:<generator>
```

## Development Workflow

### Basic Commands

```bash
# Create a feature branch (see branch naming conventions)
git checkout -b feat/lexico-your-feature
```

```bash
# Run an application — target names differ by project
pnpm exec nx run lexico:develop           # Vite dev server with hot reload
pnpm exec nx run caelundas:start          # CLI entry point
pnpm exec nx run meanderaw:repl           # Interactive REPL
```

```bash
# Run tests
pnpm exec nx run <project>:vitest             # Coverage is the default configuration
pnpm exec nx run <project>:vitest:watch       # Watch mode
pnpm exec nx run caelundas:vitest:unit        # One kind: unit, integration, end-to-end
pnpm exec nx run <project>:test-coverage      # Aggregate — reaches pytest too
```

```bash
# Code quality — lint-codebase runs every static analyser in one task graph
pnpm exec nx run-many --target=lint-codebase                            # check (default)
pnpm exec nx run-many --target=lint-codebase --configuration=write      # auto-fix
```

```bash
# Or reach for a single tool
pnpm exec nx run-many --target=eslint            # or --configuration=write to fix
pnpm exec nx run-many --target=typecheck
pnpm exec nx run-many --target=type-coverage
pnpm exec nx run-many --target=oxfmt --configuration=write
pnpm exec nx run-many --target=spell-check
pnpm exec nx run-many --target=markdown-lint     # or --configuration=write
pnpm exec nx run-many --target=knip              # or --configuration=write (caution!)
```

```bash
# Affected projects only — the fastest useful check
pnpm exec nx affected --target=lint-codebase --base=main
```

Always run tasks through Nx rather than the underlying tool, so caching and the task graph apply. Note there is **no `test` target** in this workspace — it is `vitest` for TypeScript projects and `pytest` for Python ones, both reachable through `test-coverage`.

### The Gates

Five workflows run on every pull request. Each maps to targets you can run locally before pushing. GitHub shows each with an emoji prefix — 🧑‍💻 Lint Codebase, 🧑‍🔬 Test Coverage, 🕵️ Scan Security, 👷 Make Projects, 🧑‍⚖️ Validate Conventions.

| Workflow             | Runs                                                                                                                     | Local equivalent                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Lint Codebase        | Format, lint, typecheck, type coverage, spelling, markdown, YAML, dead code, conformance, and the synchronization checks | `nx affected --target=lint-codebase`              |
| Test Coverage        | Unit, integration, and end-to-end tests with coverage thresholds                                                         | `nx affected --target=test-coverage`              |
| Scan Security        | Secrets, Python AST, dependency vulnerabilities, licenses, infrastructure misconfiguration                               | `nx affected --target=scan-security`              |
| Make Projects        | Builds every buildable project and gates its declared bundle size                                                        | `nx affected --target=make-projects`              |
| Validate Conventions | Branch name, pull request title, body, labels, assignees, and release significance                                       | See [Pull Request Process](#pull-request-process) |

🧑‍🔧 Make Codebase additionally builds the dev container image, but only when `.devcontainer/**` changes.

## Code Standards

- **TypeScript**: Explicit return types, no `any`, type imports (`import { type Foo }`), strict null checks, no non-null assertions, `readonly` on never-mutated class properties, exhaustive switches over union types, `.js` extensions on relative imports
- **No abbreviations**: write `request`, `response`, `index`, and `error` in full rather than shortening them — enforced by ESLint for TypeScript identifiers and by CSpell everywhere else, comments and string literals included
- **File naming**: kebab-case; module files take a suffix (`*.service.ts`, `*.command.ts`, `*.module.ts`, `*.constants.ts`, `*.types.ts`, `*.utilities.ts`)
- **Imports**: Auto-sorted (Node built-ins → external → workspace → parent → sibling → index → types), and alphabetical order is enforced for named imports, object literals, object types, class members, and switch cases
- **Formatting**: `oxfmt` is the formatter, not Prettier — 80-column width, 2-space indent, double quotes, trailing commas
- **React**: React 19, TanStack Router, shadcn/ui through `@codebase/lexico-components`, Tailwind CSS
- **Documentation**: TSDoc on public APIs where it adds non-obvious context; update docs alongside code

**Never silence an error.** No `eslint-disable`, `@ts-ignore`, `@ts-expect-error`, or `nocheck` comments; no loosening `compilerOptions`; no adding ESLint `ignores` or rule overrides to suppress a specific failure. Triage the root cause instead. Suppression is only acceptable when explicitly requested.

See [configuration/eslint.config.ts](configuration/eslint.config.ts) for the complete rule set, and [configuration/codebase-structure.json](configuration/codebase-structure.json) for the folder and file placement rules — placement is a lint error here, not a preference.

### Size Limits

Hard ESLint errors on source files. Test files and `*.config.*` files are exempt.

| Limit                   | Max                 |
| ----------------------- | ------------------- |
| Lines per file          | 512                 |
| Lines per function      | 128                 |
| Statements per function | 16                  |
| Block nesting depth     | 4                   |
| Nested callbacks        | 3                   |
| Classes per file        | 1                   |
| Function parameters     | 3 — constructors 12 |
| Cyclomatic complexity   | 8 (warning)         |

When a file nears 512 lines, split it along the module file suffixes instead of raising the limit.

### Coverage Gates

- **Test coverage: 96%** for branches, functions, lines, and statements, from [configuration/vitest.config.ts](configuration/vitest.config.ts). New code needs tests in the same change.
- **Type coverage** is per project, declared as `typeCoverage.atLeast` in that project's `package.json` — most packages sit at 100 with `strict: true`; the workspace root requires 95. Passing `typecheck` proves nothing about this gate, so run both.
- **Bundle size** is per project, declared in that project's `codometer.config.ts` and gated by its `codometer` target. A breach fails 👷 Make Projects and names the project.

Lowering a threshold to make a change pass is not an option — fix the code.

## Git Hooks (Husky)

Three Husky hooks enforce quality gates locally, from [configuration/.husky/](configuration/.husky). **Never bypass them with `--no-verify`** — fix the underlying issue instead.

| Hook         | Trigger      | What it runs                                                                                                       | Config                                                             |
| ------------ | ------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `pre-commit` | `git commit` | GPG signing configuration check, then **lint-staged**: format, lint, typecheck, spelling, and more on staged files | [lint-staged.config.ts](configuration/lint-staged.config.ts)       |
| `commit-msg` | `git commit` | **commitlint**: validates the Conventional Commits format                                                          | [commitlint.config.ts](configuration/commitlint.config.ts)         |
| `pre-push`   | `git push`   | **validate-branch-name**, then a commit signature check over the pushed commits                                    | [validate-branch-name.config.cjs](validate-branch-name.config.cjs) |

If a hook fails, the git operation is blocked until you fix the error. `pre-commit` writes its full output to `last-lint-staged-output.log`, which is where to look when the terminal output is truncated.

Both signing checks are run by Husky already — do not invoke `scripts/git/` signing scripts by hand in a normal commit or push.

## Branch Naming Guidelines

**Required format:** `<type>/<scope>-<description>` — all three parts required.

- **Type and scope** must be exact values from the [Types](#types) and [Scopes](#scopes) tables. An invented scope fails validation even when the branch name reads well.
- **Description** is kebab-case matching `[a-z0-9-]+` — no uppercase, underscores, dots, or extra slashes.

**Examples**: `feat/lexico-user-auth`, `fix/caelundas-timezone-bug`, `docs/documentation-contributing-guide`

Validate before pushing:

```bash
pnpm exec validate-branch-name -t "<branch-name>"
```

Only `main` is exempt. Automated prefixes are also accepted: `copilot/*`, `dependabot/*`, `jimmypaolini/copilot/*`, `renovate/*`. Both the pre-push hook and 🧑‍⚖️ Validate Conventions reject anything else, so an unvalidated branch wastes the push. See [checkout-branch](.agents/skills/checkout-branch/SKILL.md) for deriving a name, and [rename-branch](.agents/skills/rename-branch/SKILL.md) for fixing one.

## Commit Guidelines

Format: `<type>(<scope>): <gitmoji> <subject>` — a single line, max 128 characters.

- **Type and scope** come from the tables below, both lowercase
- **Gitmoji required** as the first token of the subject
- Subject is lowercase, present-imperative (`add`, not `added` or `adds`), with no trailing period
- **Body and footer are forbidden**, except lines that are exactly `Co-authored-by:` trailers. Everything else belongs in the subject or the pull request description
- Never list multiple changes — summarize at a higher level, or split the commit

Common gitmojis: ✨ `feat` · 🐛 `fix` · 📝 `docs` · 🧪 `test` · ♻️ `refactor` · 🎨 `style` · ⚡️ `perf` · 🔧 `chore` · 👷 `ci` · 📦 `build` · ⏪ `revert`

**Breaking changes**: add `!` after the scope, or a `BREAKING CHANGE:` footer.

**Examples**:

```text
feat(lexico): ✨ add user profile page
fix(caelundas): 🐛 correct aspect angle calculation
docs(documentation): 📝 update contributing guide
feat(lexico)!: 💥 redesign authentication
```

Commits are validated by commitlint through Husky. See [commit-code](.agents/skills/commit-code/SKILL.md) for details.

### Types

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

### Scopes

| Scope               | Description                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `affirmations`      | Python Jupyter notebook application for LangGraph affirmation generation                                                                  |
| `caelundas`         | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris)                                                                     |
| `configuration`     | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.)                                                                     |
| `conformetry`       | Code generator templates and validation tests for generated instances                                                                     |
| `dependencies`      | Dependency version changes (upgrades, additions, removals via pnpm)                                                                       |
| `deps`              | Dependency version changes (upgrades, additions, removals via pnpm)                                                                       |
| `deployments`       | GitHub Actions workflows and CI/CD pipeline configuration                                                                                 |
| `documentation`     | Markdown docs, skills, planning files, and AGENTS.md files                                                                                |
| `infrastructure`    | Helm charts, Terraform configs, and Kubernetes resources                                                                                  |
| `JimmyPaolini`      | Static GitHub profile README project (markdown and assets)                                                                                |
| `lexico`            | TanStack Start SSR Latin dictionary web app with Supabase backend                                                                         |
| `lexico-components` | Shared React/shadcn component library                                                                                                     |
| `lexico-entities`   | Shared TypeORM entities and GraphQL types                                                                                                 |
| `lexico-ingestion`  | Data ingestion scripts for Lexico                                                                                                         |
| `meanderaw`         | Greek meander (key/fret) SVG generator CLI and the composable motif/modifier library it reads                                             |
| `sempientor`        | Lexical gap discovery CLI that surveys English for morphological, phonotactic, and semantic gaps and coins words to fill them             |
| `callidescope`      | Call stack tracing and linting CLI, the configuration package it reads, and the packages that build and render its call graph             |
| `codependix`        | Dependency graph export CLI, the configuration package it reads, and the package that judges the graphs against declared rules            |
| `codometer`         | Code statistics measurement CLI, the configuration package it reads, and the packages that diff and render its pull request change report |
| `no-release`        | Escape hatch: suppress semantic-release for any commit type                                                                               |
| `release`           | Version bumps and release commits generated by semantic-release                                                                           |
| `reporting`         | Pull request change report generation and the packages that diff and render it                                                            |
| `scripts`           | Shell and TypeScript scripts in scripts/ (sync, setup, utilities)                                                                         |
| `testing`           | Vitest configuration, shared test utilities, and coverage setup                                                                           |
| `synchronization`   | Synchronization application and commands for automating workflows                                                                         |
| `validation`        | Validation CLI and the checks it runs, such as pull request metadata                                                                      |

If a change genuinely spans scopes, list them comma-separated (`feat(lexico,logger): ...`) rather than reaching for an umbrella scope. Better still, keep one project or module per pull request — see [Release Significance](#release-significance) for why.

## Release Significance

This repository squash-merges using the pull request title, so **the title is the only thing semantic-release ever sees**. Every individual commit on the branch is discarded at squash time.

The `pull-request-release-significance` check reads the branch's commits and fails the pull request when the title's type is **less** release-significant than the most significant commit on the branch, or when a commit uses a scope the title does not name.

**Practical effect:** pick the type and scope for the branch as a whole before you start committing, and keep every commit at or below that significance.

- A `feat` commit on a branch titled `chore` or `ci` fails the check — either retitle the pull request as `feat`, or move that commit to its own branch.
- Mixing `feat` and `fix` work is fine; title it `feat`, since `feat` outranks `fix`. Mixing only breaks when a later commit is _more_ significant than the type already chosen.

This is also why one project or module per pull request is the rule: the fewer concerns a branch carries, the less likely it accumulates a commit that outranks its title.

## Pull Request Process

1. **Push and open**: `git push -u origin <branch>`, then `gh pr create` and fill in the template. Do not use `--fill` — it substitutes the commit message for the body and drops the four required headings
2. **Title** follows the commit format — `<type>(<scope>): <gitmoji> <subject>`, checked by the same commitlint configuration, so every commit rule applies
3. **Description** must contain all four headings from [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md) verbatim — 🌰 Summary, 📝 Details, 🧪 Testing, 🔗 Related. Validate Conventions greps for each and fails when one is missing
4. **Labels and assignees** must agree with the title: exactly one `type:*` label matching the title's type, exactly the `scope:*` labels the title names and no extras, at least one assignee, and exactly one `source:*` label (`source:agent` or `source:human`) declaring who opened it. The `do-not-merge` label blocks the pull request while present
5. **Automated checks**: the five workflows in [The Gates](#the-gates) must pass
6. **Code review**: requires `@JimmyPaolini` approval ([CODEOWNERS](.github/CODEOWNERS))
7. **Merge**: squash and merge, then delete the branch

Validate Conventions creates any label missing from the vocabulary when a pull request is opened or reopened, so a fresh pull request already has the labels it needs. That vocabulary lives in [configuration/conventional.config.cjs](configuration/conventional.config.cjs) and is never hard-coded elsewhere.

A pull request with merge conflicts runs almost none of these workflows — a short list of green checks means nothing was validated. Resolve conflicts before reading the checks as a pass.

See [create-pull-request](.agents/skills/create-pull-request/SKILL.md) and [update-pull-request](.agents/skills/update-pull-request/SKILL.md) for the full workflow.

## Release Process

Releases use [semantic-release](https://semantic-release.gitbook.io/), fully automated on merge to `main` by the 🦸 Push Releases workflow. Versioning is fixed — the whole codebase shares one version — and nothing is published to a package registry.

**Version bumps**, from `releaseRules` in [release.config.cjs](release.config.cjs):

| Bump  | Types                                                                           |
| ----- | ------------------------------------------------------------------------------- |
| Major | Any breaking change — `!` after the scope, or a `BREAKING CHANGE:` footer       |
| Minor | `feat`                                                                          |
| Patch | `fix`, `perf`, `refactor`, `build`, `revert`                                    |
| None  | `docs`, `style`, `test`, `ci`, `chore`, or any type with the `no-release` scope |

**Workflow**: merge to `main` → semantic-release analyzes the squashed commit → bumps the version → updates `CHANGELOG.md` → creates the tag and GitHub release.

**Test locally:**

```bash
pnpm semantic-release:dry-run
```

Never hand-edit `CHANGELOG.md` or bump a version manually. A green Push Releases run does not by itself mean a release happened — most runs are correctly no-ops.

## Code Ownership

All files are owned by `@JimmyPaolini` (see [.github/CODEOWNERS](.github/CODEOWNERS)).

Pull requests require owner approval before merging.

## Environment Variables

Each project ships a `.env.default` template with safe placeholder values. `scripts/local/environment.sh` copies each to `.env` during setup and never overwrites an existing one. To do it by hand, copy `.env.default` to `.env` in the directory you need and fill in the values.

### Root (`.env.default`)

| Variable                                     | Purpose                                                             |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `GH_TOKEN` / `GITHUB_TOKEN`                  | GitHub token for `gh`, release automation, and agent sessions       |
| `CODEBASE_ENVIRONMENT`                       | Environment: `local`, `devcontainer-local`, or `devcontainer-cloud` |
| `LOCAL_WORKSPACE_FOLDER`                     | Workspace path, appended by setup for `docker-compose` mounts       |
| `OLLAMA_HOST`                                | Ollama server URL (default: `http://localhost:11434`)               |
| `SEARXNG_HOST`                               | SearxNG server URL (default: `http://localhost:8889`)               |
| `POSTGRES_HOST` / `POSTGRES_PORT`            | Local PostgreSQL connection target (`localhost`, `5432`)            |
| `POSTGRES_USER` / `POSTGRES_PASSWORD`        | Local PostgreSQL credentials (`postgres` / `postgres`)              |
| `POSTGRES_DB`                                | Local PostgreSQL database name (`postgres`)                         |
| `GEMINI_API_KEY`                             | Gemini key used by OpenWiki documentation generation                |
| `OPENWIKI_PROVIDER` / `OPENWIKI_MODEL`       | OpenWiki model selection                                            |
| `OPENWIKI_TELEMETRY_DISABLED`                | Opts OpenWiki out of telemetry                                      |
| `TF_VAR_linode_token`                        | Linode API token for Terraform provisioning                         |
| `TF_VAR_linode_kubernetes_engine_cluster_id` | Linode Kubernetes Engine cluster ID for deployments                 |

### caelundas (`applications/caelundas/.env.default`)

| Variable           | Default      | Purpose                                       |
| ------------------ | ------------ | --------------------------------------------- |
| `LATITUDE`         | `39.949309`  | Observer latitude for ephemeris calculations  |
| `LONGITUDE`        | `-75.17169`  | Observer longitude for ephemeris calculations |
| `START_DATE`       | `2026-07-01` | Calculation start date (YYYY-MM-DD)           |
| `END_DATE`         | `2026-07-31` | Calculation end date (YYYY-MM-DD)             |
| `OUTPUT_DIRECTORY` | `./output`   | Directory for generated calendar files        |

Other projects ship their own templates; read the `.env.default` beside the project you are working on.

## Dependency Update Workflow

The 🧑‍🚒 Upgrade Dependencies workflow runs weekly and opens a reviewable pull request with dependency bumps and refreshed agent skills. To check or update by hand:

```bash
pnpm outdated
```

```bash
pnpm update
```

Add a dependency through the package manager so the manifest and lockfile stay in step — `@nx/dependency-checks` fails lint when an imported package is missing from its project's `package.json`:

```bash
pnpm add --filter <project> <package>
```

```bash
pnpm add -w <package>
```

## Additional Resources

- [AGENTS.md](AGENTS.md) — the full conventions reference, mirrored to `CLAUDE.md` and `.github/copilot-instructions.md`
- [CONTEXT.md](CONTEXT.md) — domain model and shared vocabulary
- [docs/adr](docs/adr) — architecture decision records
- [openwiki/quickstart.md](openwiki/quickstart.md) — generated code documentation
- [.agents/skills](.agents/skills) — agent skills, the canonical source for every agent entrypoint
- [Commit Messages Guide](.agents/skills/commit-code/SKILL.md)
- [Code Validation Guide](.agents/skills/validate-code/SKILL.md)
- [Semantic Release Config](release.config.cjs)
- [GitHub Actions Workflows](.github/workflows)
- [Gitmoji Reference](https://gitmoji.dev)
- [Nx Documentation](https://nx.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/JimmyPaolini/codebase/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JimmyPaolini/codebase/discussions)
- **Security:** [SECURITY.md](SECURITY.md)
- **Owner:** [@JimmyPaolini](https://github.com/JimmyPaolini)

## License

MIT License. Copyright (c) Jimmy Paolini.
