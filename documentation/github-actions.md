# GitHub Actions CI/CD

This document describes the CI/CD pipeline architecture for the monorepo.

## Overview

The monorepo uses 11 GitHub Actions workflows and 1 composite action, all located in `.github/`. Every workflow uses the shared [`setup-monorepo`](#composite-action-setup-monorepo) composite action for consistent environment setup and Nx caching.

## Composite Action: setup-monorepo

**Location:** `.github/actions/setup-monorepo/action.yml`

All workflows call this composite action after checkout. It provides:

|Step|Tool|Purpose|
|---|---|---|
|pnpm|pnpm/action-setup@v4|Package manager|
|Node.js|actions/setup-node@v4|JavaScript runtime from `.nvmrc`, with pnpm cache|
|Nx SHAs|nrwl/nx-set-shas@v4|Calculates `NX_BASE`/`NX_HEAD` for affected commands|
|Nx output style|env var|Sets `NX_DEFAULT_OUTPUT_STYLE=static`|
|Homebrew|Homebrew/actions/setup-homebrew|Package manager for system tools|
|gitleaks|brew install|Secret scanning tool|
|Nx cache|actions/cache@v4|Restores/saves `.nx/cache` keyed on lockfile + SHA|
|uv|astral-sh/setup-uv@v6|Python package manager with cache|
|Python dependencies|uv sync|Installs affirmations Python deps from pyproject.toml|
|Node.js dependencies|pnpm install --frozen-lockfile|Frozen lockfile install|

**Usage in workflows:**

```yaml
- name: 📥 Checkout Repository
  uses: actions/checkout@v4
  with:
    fetch-depth: 0

- name: 🕋 Setup Monorepo
  uses: ./.github/actions/setup-monorepo
```

---

## Workflows

### On Every PR + Push to Main

#### 1. Analyze Code (`analyze-code.yml`)

**Name:** 🧑‍💻 Analyze Code

**Triggers:** Push to `main`, pull requests, manual dispatch (optional `verbose` flag)

**Jobs:**

- **analyze-code** - Runs `pnpm exec nx affected --target=analyze-code` then uploads type coverage reports from `applications/*/`, `packages/*/`, and `tools/*/` as artifacts (30-day retention)

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 2. Build Projects (`build-projects.yml`)

**Name:** 👷 Build Projects

**Triggers:** Push to `main`, pull requests

**Jobs:**

- **build-projects** - Runs `npx nx run-many --all --target=build --parallel=3` to build all projects
- **Bundle Report** (PR only) - Builds both PR and base branch, runs `size-limit` on lexico and lexico-components, calculates size differences, and posts a comparison table comment on the PR with emoji status indicators (✅ decrease / ⚠️ increase / 📈 significant / ❌ over limit)

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 3. Test Coverage (`test-coverage.yml`)

**Name:** 🧑‍🔬 Test Coverage

**Triggers:** Push to `main`, pull requests, manual dispatch (optional `verbose` flag)

**Jobs:**

- **test-coverage** - Runs `npx nx affected --target=test --parallel=3 --configuration=coverage` and uploads coverage reports as artifacts (30-day retention, always runs even if tests fail)

**Concurrency:** Cancels in-progress runs for the same branch

---

### On PRs + Push to Main (Security)

#### 4. Audit Security (`audit-security.yml`)

**Name:** 🕵️ Audit Security

**Triggers:** Push to `main`, pull requests, weekly (Monday 6am UTC)

**Jobs:** Single job running sequential security checks:

|Check|Command / Tool|
|---|---|
|🔍 Gitleaks|`pnpm exec nx run monorepo:gitleaks --configuration=ci`|
|🐍 Bandit (Python)|`pnpm exec nx affected --target=bandit --parallel=3`|
|📦 Dependency Audit|`pnpm exec nx affected --target=scan-dependencies --parallel=3`|
|🏗 Trivy (Infrastructure)|`aquasecurity/trivy-action@v0.36.0` on `infrastructure/terraform/` (severity: `CRITICAL,HIGH`; runs on schedule or when Terraform files changed)|

**Concurrency:** Cancels in-progress runs for the same branch

---

### On PRs Only

#### 5. Validate Conventions (`validate-conventions.yml`)

**Name:** 🧑‍⚖️ Validate Conventions

**Triggers:** Pull requests (opened, reopened, synchronize, edited), push to `main`

**Condition:** Skips for `dependabot[bot]`

**Jobs:** Single job with sequential convention checks:

|Check|What it validates|
|---|---|
|🎋 Branch Validation|Branch name matches `<type>/<scope>-<description>` via `validate-branch-name` (PR only)|
|📝 PR Title Validation|PR title follows Conventional Commits format via `commitlint` (PR only)|
|🪢 PR Body Validation|PR body contains required `## 🌰 Summary`, `## 📝 Details`, `## 🧪 Testing`, `## 🔗 Related` sections (PR only)|
|⚙️ Convention Config Sync|`npx nx run synchronization:start:conventional-config-check`|
|📋 PR Template Sync|`npx nx run synchronization:start:pull-request-template-check`|
|🤖 Agent Skills Sync|`npx nx run synchronization:start:agent-skills-check`|

**Concurrency:** Cancels in-progress runs for the same branch

---

### Automated (Push to Main)

#### 6. Release Version (`release-version.yml`)

**Name:** 🦸 Release Version

**Triggers:** Push to `main`, manual dispatch

**Jobs:**

- **release-version** - Runs `pnpm semantic-release` to analyze commits, bump version, update `CHANGELOG.md`, and create a GitHub release. Uses GPG-signed commits.

**Permissions:** `contents: write`, `issues: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

### Automated (Path-Filtered)

#### 7. Make Devcontainer (`make-devcontainer.yml`)

**Name:** 🧑‍🔧 Make Devcontainer

**Triggers:**

- Push to `main` (only `.devcontainer/**` changes)
- Pull requests (only `.devcontainer/**` or `make-devcontainer.yml` changes)
- Manual dispatch

**Jobs:**

- **make-devcontainer** - Validates VSCode extensions sync, builds the dev container image using `devcontainers/ci@v0.3`, pushes to GHCR (`ghcr.io/jimmypaolini/monorepo-devcontainer`) only on push to `main`, then runs `.devcontainer/scripts/test-devcontainer.sh` inside the container

**Permissions:** `contents: read`, `packages: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 8. Setup Copilot (`copilot-setup-steps.yml`)

**Name:** 🤖 Setup Copilot

**Triggers:** Manual dispatch, push/PR if `copilot-setup-steps.yml` changes

**Jobs:**

- **copilot-setup-steps** - Runs `setup-monorepo`, imports the repository GPG signing key, enables commit signing, and authenticates the GitHub CLI (`gh auth login`) for use by Copilot agents

**Required secrets for Copilot cloud agents:**

- `GPG_PRIVATE_KEY` - ASCII-armored private key exported with `gpg --armor --export-secret-keys <email>` and stored as a secret in the repository's `copilot` environment
- `GPG_PASSPHRASE` - Passphrase for the private key, stored as a secret in the repository's `copilot` environment
- The matching public key must be added to the GitHub account that should show verified signatures under **Settings → SSH and GPG keys**

**Permissions:** `contents: read`, `pull-requests: write`

---

### Scheduled (Weekly)

#### 9. Remove Deprecations (`remove-deprecations.yml`)

**Name:** ✂️ Remove Deprecations

**Triggers:** Weekly (Sunday 6am UTC), manual dispatch

**Jobs:**

- **remove-deprecations** - Closes any existing `chore/monorepo-remove-deprecations` PR, runs `pnpm exec nx run monorepo:clean:write` (knip) to remove unused code/exports/dependencies, then opens a new GPG-signed PR on the `chore/monorepo-remove-deprecations` branch with labels `automated` assigned to `JimmyPaolini`

**Permissions:** `contents: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 10. Refresh Documentation (`refresh-documentation.yml`)

**Name:** 🧑‍🏫 Refresh Documentation

**Triggers:** Weekly (Sunday 12am UTC), manual dispatch

**Jobs:**

- **refresh-documentation** - Runs the OpenWiki code brain to audit repository documentation (README.md, `documentation/`, AGENTS.md, skills), classifying findings as Deprecated/Outdated/Missing, then creates a PR with a `docs(documentation): 📝` commit message

**Permissions:** `contents: read`

**Concurrency:** Cancels in-progress runs for the same branch

**Operator runbook:**

- **Required secret/configuration:** the OpenWiki agent must have Gemini credentials available for non-interactive runs. The workflow currently pins `OPENWIKI_PROVIDER=gemini`, `OPENWIKI_MODEL=gemini-3.6-flash`, and `OPENWIKI_TELEMETRY_DISABLED=true`. Missing `GEMINI_API_KEY` causes `openwiki code --update --print` to fail before any docs are generated.
- **How to trigger:** use the scheduled Sunday 12:00 UTC run or launch the workflow manually with `workflow_dispatch`.
- **Expected output when changes exist:** OpenWiki writes documentation updates under `openwiki/**`, then opens or updates the `docs/monorepo-refresh-documentation` PR with the `docs(documentation): 📝 refresh documentation with openwiki` commit message.
- **Expected output when nothing changes:** the Copilot task still completes, but the resulting PR remains a shell with no file changes and no documentation updates to merge.
- **Troubleshooting:** if the run fails with a missing-key error, verify the Gemini secret in the repo/environment used by Actions. If the guardrail fails, inspect the diff for files outside `openwiki/**`, `AGENTS.md`, or `.github/workflows/refresh-documentation.yml`.

---

#### 11. Upgrade Dependencies (`upgrade-dependencies.yml`)

**Name:** 🧑‍🚒 Upgrade Dependencies

**Triggers:** Weekly (Sunday 10am UTC), manual dispatch

**Jobs:**

- **upgrade-dependencies** - Upgrades pnpm (self-update), Node.js (via nvm LTS, writes `.nvmrc`), Python (via uv), all Node.js dependencies (`nx run monorepo:upgrade-dependencies:write`), and Python dependencies (`uv lock --upgrade`). If any changes are detected, closes the existing `chore/dependencies-upgrade` PR and opens a new GPG-signed one with labels `dependencies`, `automated` assigned to `JimmyPaolini`

**Permissions:** `contents: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

## Workflow Architecture

### Concurrency Strategy

All workflows use concurrency groups keyed by `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. This ensures only one run per branch per workflow, canceling older runs when new commits are pushed.

### Affected Commands

Most workflows use `nx affected -t <target>` which only runs tasks on projects changed since the base branch. The `nrwl/nx-set-shas` action in `setup-monorepo` automatically determines the correct base SHA (`NX_BASE`) and head SHA (`NX_HEAD`) for comparison.

### Caching

- **pnpm cache:** Managed by `actions/setup-node` via pnpm lockfile hash
- **Nx cache:** Managed by `actions/cache` with SHA-based keys and restore fallbacks (`.nx/cache`)
- **uv cache:** Managed by `astral-sh/setup-uv` for Python dependencies

---

## Adding a New Workflow

1. Create `.github/workflows/<name>.yml`
2. Use the standard pattern:

   ```yaml
   name: <emoji> <Name>

   on:
     push:
       branches: [main]
     pull_request:

   concurrency:
     group: ${{ github.workflow }}-${{ github.ref }}
     cancel-in-progress: true

   jobs:
     <job-name>:
       name: <emoji> <Job Name>
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
           with:
             fetch-depth: 0
         - uses: ./.github/actions/setup-monorepo
         - run: npx nx affected -t <target> --parallel=3
   ```

3. Follow the emoji naming convention used by existing workflows
4. Use `nx affected` for project-specific tasks and `nx run monorepo:<target>` for workspace-level tasks
