# Contributing to Codebase

Thank you for contributing! This guide covers the development workflow, code standards, and release process.

## Table of Contents

- [Contributing to Codebase](#contributing-to-codebase)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
    - [Option 1: Local Setup (macOS, Recommended)](#option-1-local-setup-macos-recommended)
    - [Option 2: Dev Container](#option-2-dev-container)
    - [Workspace Structure](#workspace-structure)
  - [Development Workflow](#development-workflow)
    - [Basic Commands](#basic-commands)
  - [Code Standards](#code-standards)
  - [Git Hooks (Husky)](#git-hooks-husky)
  - [Branch Naming Guidelines](#branch-naming-guidelines)
  - [Commit Guidelines](#commit-guidelines)
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

The fastest way to get started on macOS is using the setup script, which installs all required tools and dependencies via Homebrew.

**Prerequisites:**

- **macOS** with [Homebrew](https://brew.sh/) installed
- **Git**: Latest stable version
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required for SearxNG, Open WebUI, and caelundas containers

**Setup:**

```bash
git clone https://github.com/JimmyPaolini/codebase.git
cd codebase
./scripts/local/setup.sh
```

This script:

- Installs **nvm**, **Node.js** (24.16.0 from `.nvmrc`), **pnpm**, **uv**, **Python** (3.11+), **Ollama** (+ pulls `gemma4:e2b`)
- Installs **Terraform**, **Helm**, **kubectl**, **GitHub CLI**, **jq**, **yamllint**
- Creates `.env` files from `.env.default` templates (root, lexico, caelundas)
- Sets `LOCAL_WORKSPACE_FOLDER` for docker-compose volume mounts
- Runs `pnpm install` and `uv sync` (Python venv for affirmations)

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
   - **Codebase Devcontainer (Local)** — local machine (Docker-outside-of-Docker, recommended)
   - **Codebase Devcontainer (Cloud)** — GitHub Codespaces or when full Docker isolation is needed (Docker-in-Docker)
5. Wait for container build (~2-3 minutes first time)
6. Start developing!

**Included Tools:**

| Tool         | Version                     | Purpose                                                      |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| Node.js      | 24.16.0                     | JavaScript runtime                                           |
| pnpm         | 10.20.0                     | Package manager                                              |
| Terraform    | latest                      | Infrastructure provisioning (Linode)                         |
| kubectl      | latest                      | Kubernetes cluster management                                |
| Helm         | latest                      | Kubernetes package manager                                   |
| GitHub CLI   | latest                      | Repository operations                                        |
| Docker       | DooD (local) / DinD (cloud) | Docker-outside-of-Docker on local; Docker-in-Docker in cloud |

The repository pins Node through both `.nvmrc` and `.node-version`. Note that `.nvmrc` is declarative and only takes effect after running `nvm use` (or enabling automatic `nvm` directory switching in your shell).

**Port Forwarding:**

| Port  | Service           | Auto-Forward |
| ----- | ----------------- | ------------ |
| 3000  | Lexico Dev Server | Notify       |
| 3001  | Open WebUI        | Notify       |
| 8889  | SearxNG           | Notify       |
| 11434 | Ollama API        | Silent       |

See [.devcontainer/README.md](.devcontainer/README.md) for detailed configuration and troubleshooting.

### Workspace Structure

```text
codebase/
├── applications/           # Deployable applications
│   ├── affirmations/      # Python LangChain + Ollama affirmation generator
│   ├── caelundas/         # CLI ephemeris calendar generator
│   ├── lexico/            # TanStack Start web app
│   └── JimmyPaolini/      # Personal website
├── packages/              # Shared libraries
│   └── lexico-components/ # React component library (shadcn/ui)
├── documentation/         # Guides and references
├── infrastructure/        # Helm charts, Terraform
└── tools/                # Build tools and generators
```

## Development Workflow

### Basic Commands

```bash
# Create feature branch (see branch naming conventions)
git checkout -b feat/lexico-your-feature

# Run development server
nx run <project>:develop          # caelundas, lexico, JimmyPaolini

# Run tests
nx run <project>:test             # All tests
nx run <project>:test:watch       # Watch mode
nx run caelundas:test:unit        # Specific type

# Code quality (use --all for all projects)
nx run-many --target=lint --all           # or :lint:write to fix
nx run-many --target=typecheck --all
nx run-many --target=format:check --all   # or :format:write
nx run-many --target=spell-check --all
nx run-many --target=markdown-lint --all  # or :markdown-lint:write
nx run-many --target=knip --all           # or :knip:write (caution!)
nx run-many --target=analyze-code --all  # Run all checks

# Affected projects only
nx affected --target=test
```

## Code Standards

- **TypeScript**: Explicit return types, no `any`, type imports (`import { type T }`), strict null checks
- **Imports**: Auto-sorted (Node built-ins → external → workspace → relative → types)
- **Naming**: PascalCase (types/classes), camelCase (variables/functions), UPPER_CASE (constants), kebab-case (files)
- **React**: React 19, TanStack Router, shadcn/ui via `@codebase/lexico-components`, Tailwind CSS
- **Documentation**: TSDoc for public APIs, update docs with code changes

See [eslint.config.ts](configuration/eslint.config.ts) for complete rules.

## Git Hooks (Husky)

Three Husky hooks enforce quality gates locally. **Never bypass them with `--no-verify`** — fix the underlying issue instead.

| Hook         | Trigger      | What it runs                                                                         | Config                                                             |
| ------------ | ------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `pre-commit` | `git commit` | **lint-staged**: format, lint, typecheck, spell-check, and more on staged files      | [lint-staged.config.ts](configuration/lint-staged.config.ts)       |
| `commit-msg` | `git commit` | **commitlint**: validates Conventional Commits format (`<type>(<scope>): <subject>`) | [commitlint.config.ts](configuration/commitlint.config.ts)         |
| `pre-push`   | `git push`   | **validate-branch-name**: enforces `<type>/<scope>-<description>` pattern            | [validate-branch-name.config.cjs](validate-branch-name.config.cjs) |

If a hook fails, the git operation is blocked until you fix the error. See the config files linked above for details on what each hook checks.

## Branch Naming Guidelines

**Required format:** `<type>/<scope>-<description>` (lowercase, kebab-case)

**Examples**: `feat/lexico-user-auth`, `fix/codebase-routing`, `docs/caelundas-api`

Validated by Husky pre-push hook and GitHub Actions. See [checkout-branch skill](.github/skills/checkout-branch/SKILL.md) for details.

## Commit Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <gitmoji> <subject>` (max 128 chars, imperative mood, lowercase)

**Types**: `feat` (minor release), `fix`/`perf`/`refactor`/`build` (patch), `docs`/`test`/`ci`/`chore` (no release)

**Scopes**: `codebase`, `caelundas`, `lexico`, `lexico-components`, `JimmyPaolini`, `documentation`, `dependencies`, `infrastructure`, `ci`

**Breaking changes**: Add `!` after type or `BREAKING CHANGE:` in footer (triggers major release)

**Examples**:

```bash
feat(caelundas): add moon phase calculation
fix(lexico): resolve mobile layout overflow
feat(api)!: redesign authentication  # Breaking change
```

Commits are validated by commitlint + Husky. See [commit-code skill](.github/skills/commit-code/SKILL.md) for details.

## Pull Request Process

1. **Create PR**: `git push origin feat/your-feature && gh pr create --fill`
2. **PR title**: Use Conventional Commits format (e.g., `feat(lexico): add search`)
3. **Automated checks**: Lint, typecheck, tests, format, spell-check, markdown-lint (all must pass)
4. **Code review**: Requires `@JimmyPaolini` approval ([CODEOWNERS](.github/CODEOWNERS))
5. **Merge**: Squash and merge with Conventional Commits message, delete branch

## Release Process

Releases use [semantic-release](https://semantic-release.gitbook.io/) - fully automated on merge to `main`.

**Version bumps**: `BREAKING CHANGE` → major, `feat` → minor, `fix`/`perf`/`refactor`/`build` → patch, `docs`/`test`/`ci`/`chore` → none

**Workflow**: Merge PR to `main` → automated release runs → analyzes commits → bumps version → updates `CHANGELOG.md` → creates tag & GitHub release

**Test locally**: `pnpm semantic-release:dry-run`

**Prevent release**: Use `docs`/`test`/`ci`/`chore` types or `no-release` scope

See [release.config.cjs](release.config.cjs) for complete configuration and guide.

## Code Ownership

All files are owned by `@JimmyPaolini` (see [.github/CODEOWNERS](.github/CODEOWNERS)).

Pull requests require owner approval before merging.

## Environment Variables

Each project uses `.env.default` files as templates for required environment variables. Copy `.env.default` to `.env` in each directory and fill in values.

### Root (`.env.default`)

| Variable                                     | Purpose                                                             |
| -------------------------------------------- | ------------------------------------------------------------------- |
| `CODEBASE_ENVIRONMENT`                       | Environment: `local`, `devcontainer-local`, or `devcontainer-cloud` |
| `OLLAMA_HOST`                                | Ollama server URL (default: `http://localhost:11434`)               |
| `SEARXNG_HOST`                               | SearxNG server URL (default: `http://localhost:8889`)               |
| `TF_VAR_linode_token`                        | Linode API token for Terraform provisioning                         |
| `TF_VAR_linode_kubernetes_engine_cluster_id` | LKE cluster ID for deployments                                      |

### caelundas (`applications/caelundas/.env.default`)

| Variable             | Default     | Purpose                                       |
| -------------------- | ----------- | --------------------------------------------- |
| `LATITUDE`           | `39.949309` | Observer latitude for ephemeris calculations  |
| `LONGITUDE`          | `-75.17169` | Observer longitude for ephemeris calculations |
| `START_DATE`         | (dynamic)   | Calculation start date (YYYY-MM-DD)           |
| `END_DATE`           | (dynamic)   | Calculation end date (YYYY-MM-DD)             |
| `OUTPUT_DIRECTORY`   | `./output`  | Directory for generated calendar files        |
| `MAX_RETRIES`        | `5`         | NASA JPL API retry attempts                   |
| `INITIAL_DELAY_MS`   | `1000`      | Initial retry backoff delay                   |
| `MAX_DELAY_MS`       | `30000`     | Maximum retry backoff delay                   |
| `BACKOFF_MULTIPLIER` | `2`         | Exponential backoff factor                    |

## Dependency Update Workflow

To check for updates manually:

```bash
pnpm outdated  # See which packages are outdated
pnpm update    # Update within semver ranges
```

## Additional Resources

- [Commit Messages Guide](.github/skills/commit-code/SKILL.md)
- [Semantic Release Config](release.config.cjs)
- [GitHub Actions Guide](documentation/github-actions.md) - CI/CD workflows and composite actions
- [Gitmoji Reference](documentation/gitmoji.md)
- [Nx Documentation](https://nx.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/JimmyPaolini/codebase/issues)
- **Discussions:** [GitHub Discussions](https://github.com/JimmyPaolini/codebase/discussions)
- **Owner:** [@JimmyPaolini](https://github.com/JimmyPaolini)

## License

MIT License. Copyright (c) Jimmy Paolini.
