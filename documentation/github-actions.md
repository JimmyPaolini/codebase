# GitHub Actions CI/CD

This document describes the CI/CD pipeline architecture for the codebase.

## Overview

The codebase uses 11 GitHub Actions workflows and 1 composite action, all located in `.github/`. Every workflow uses the shared [`setup-codebase`](#composite-action-setup-codebase) composite action for consistent environment setup and Nx caching.

## Composite Action: setup-codebase

**Location:** `.github/actions/setup-codebase/action.yml`

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

- name: 🕋 Setup Codebase
  uses: ./.github/actions/setup-codebase
```

---

## Workflows

### On Every PR + Push to Main

#### 1. Lint Codebase (`lint-codebase.yml`)

**Name:** 🧑‍💻 Lint Codebase

**Triggers:** Push to `main`, pull requests, manual dispatch (optional `verbose` flag)

**Jobs:**

- **lint-codebase** - Runs `pnpm exec nx affected --target=lint-codebase --configuration=check --parallel=4`, then uploads type coverage reports from `applications/*/`, `packages/*/`, and `tools/*/` as artifacts (30-day retention)

`lint-codebase` is an `nx:noop` target whose `dependsOn` list holds every static
analyser: typecheck, type-coverage, eslint, oxlint, oxfmt, knip, spell-check,
markdown-lint, yaml-lint, dependency-cruiser, stylelint, squawk, sqlfluff, ruff,
vulture, nbstripout, sherif, syncpack, codometer, conformetry-validate, and the
synchronization checks. One invocation builds one task graph; the composites it
replaced spawned a nested `nx run` per tool.

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 2. Test Coverage (`test-coverage.yml`)

**Name:** 🧑‍🔬 Test Coverage

**Triggers:** Push to `main`, pull requests, manual dispatch (optional `verbose` flag)

**Jobs:**

- **test-coverage** - Runs `pnpm exec nx affected --target=vitest-coverage --configuration=coverage --parallel=4` and uploads coverage reports as artifacts (30-day retention, always runs even if tests fail)

`--configuration=coverage` must stay explicit: Nx propagates an explicit
configuration down `dependsOn`, but never a `defaultConfiguration`.

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 3. Make Projects (`make-projects.yml`)

**Name:** 👷 Make Projects

**Triggers:** Push to `main`, pull requests, manual dispatch

**Jobs:**

- **detect-changes** - `dorny/paths-filter` job that reports whether `.devcontainer/**` changed, since `on.paths` cannot be scoped to a single job
- **make-projects** - Runs `pnpm exec nx affected --target=make-projects --parallel=4` (build plus bundlesize). On `main` it uploads every `size-limit-report.json` as the `bundle-sizes-main` artifact; on pull requests it downloads that artifact, renders a per-project table with `scripts/report-bundle-sizes.ts`, and upserts one PR comment (✅ decrease / ⚠️ increase under 5% / 📈 5% or more / 🆕 no baseline / ❌ over limit)
- **make-devcontainer** (only when `.devcontainer/**` changed) - Builds the dev container image with `devcontainers/ci@v0.3`, pushes to GHCR (`ghcr.io/jimmypaolini/codebase-devcontainer`) only on push to `main`, then runs `.devcontainer/scripts/test-devcontainer.sh` inside the container

The baseline comes from an artifact rather than a second build: this job used to
check out `main`, install it, and build it again on every pull request purely to
size the base branch.

**Permissions:** `contents: read`, `pull-requests: write`; the devcontainer job adds `packages: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

### On PRs + Push to Main (Security)

#### 4. Scan Security (`scan-security.yml`)

**Name:** 🕵️ Scan Security

**Triggers:** Push to `main`, pull requests, weekly (Monday 6am UTC), manual dispatch

**Jobs:** Single job:

|Check|Command / Tool|
|---|---|
|🕵️ Scan Security|`pnpm exec nx affected --target=scan-security --parallel=4` — bandit, dependency audit, license check, and Trivy|
|🚰 Scan Secrets|`pnpm exec nx run codebase:gitleaks:ci` — run outside `affected` because it scans history, not a project|

Trivy runs as the `trivy-config` Nx target rather than
`aquasecurity/trivy-action`, so `nx run codebase:trivy-config` reproduces CI
exactly. Its `inputs` cover the Terraform tree, which replaces the previous
`paths-filter` step and its schedule-event special case.

**Concurrency:** Cancels in-progress runs for the same branch

---

### On PRs Only

#### 5. Validate Conventions (`validate-conventions.yml`)

**Name:** 🧑‍⚖️ Validate Conventions

**Triggers:** Pull requests (opened, reopened, synchronize, edited)

**Condition:** Skips for `dependabot[bot]`, and for `dependabot/` and `renovate/` branches

**Jobs:** Single job with sequential convention checks:

|Check|What it validates|
|---|---|
|🎋 Branch Validation|Branch name matches `<type>/<scope>-<description>` via `validate-branch-name` (PR only)|
|📝 PR Title Validation|PR title follows Conventional Commits format via `commitlint` (PR only)|
|🪢 PR Body Validation|PR body contains required `## 🌰 Summary`, `## 📝 Details`, `## 🧪 Testing`, `## 🔗 Related` sections (PR only)|

The convention, PR-template, and agent-skills sync checks moved into
`lint-codebase` as `synchronize` — a single command that runs all five
synchronizations in one process. This workflow deliberately skips
`setup-codebase` entirely: no Nx, no uv, no Homebrew.

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

### Automated (Manual / Path-Filtered)

#### 7. Setup Copilot (`copilot-setup-steps.yml`)

**Name:** 🤖 Setup Copilot

**Triggers:** Manual dispatch, push/PR if `copilot-setup-steps.yml` changes

**Jobs:**

- **copilot-setup-steps** - Runs `setup-codebase`, imports the repository GPG signing key, validates signing and branch requirements via the same session-hook scripts (`scripts/git/validate-session-commit-signing.sh`, `scripts/git/validate-session-branch-name.sh`), and executes `scripts/git/check-gh-authentication.sh` for idempotent GitHub CLI bootstrap (`GH_TOKEN` sourced from `${{ github.token }}`, stale `~/.config/gh/hosts.yml` cleanup, non-interactive `gh auth login`, `gh auth setup-git`, and auth verification via `gh auth status` + `gh project list`)

**Required secrets for Copilot cloud agents:**

- `GPG_PRIVATE_KEY` - ASCII-armored private key exported with `gpg --armor --export-secret-keys <email>` and stored as a secret in the repository's `copilot` environment
- `GPG_PASSPHRASE` - Passphrase for the private key, stored as a secret in the repository's `copilot` environment
- The matching public key must be added to the GitHub account that should show verified signatures under **Settings → SSH and GPG keys**

**Required token access for `${{ github.token }}` used by GitHub CLI bootstrap:**

- repository access (`repo` for classic PAT, or equivalent fine-grained repository permissions)
- `read:org` when organization membership lookups are required
- Projects access (`project` scope for classic PATs, or Projects read/write permissions for fine-grained tokens)

**Permissions:** includes `repository-projects: read` (for `gh project list`) plus repository read/write scopes required by Copilot setup and PR workflows

---

### Scheduled (Weekly)

#### 8. Remove Deprecations (`remove-deprecations.yml`)

**Name:** ✂️ Remove Deprecations

**Triggers:** Weekly (Sunday 6am UTC), manual dispatch

**Jobs:**

- **remove-deprecations** - Closes any existing `chore/codebase-remove-deprecations` PR, runs `pnpm exec nx run codebase:clean:write` (knip) to remove unused code/exports/dependencies, then opens a new GPG-signed PR on the `chore/codebase-remove-deprecations` branch with labels `automated` assigned to `JimmyPaolini`

**Permissions:** `contents: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

#### 9. Refresh Documentation (`refresh-documentation.yml`)

**Name:** 🧑‍🏫 Refresh Documentation

**Triggers:** Weekly (Sunday 12am UTC), manual dispatch

**Jobs:**

- **refresh-documentation** - Runs the OpenWiki code brain to audit repository documentation, classifying findings as Deprecated/Outdated/Missing, then creates a PR with a `docs(documentation): 📝` commit message after the workflow guardrail allows only `openwiki/**`, `AGENTS.md`, and `.github/workflows/refresh-documentation.yml`

**Permissions:** `contents: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

**Operator runbook:**

- **Required secret/configuration:** the OpenWiki agent must have Gemini credentials available for non-interactive runs. The workflow currently pins `OPENWIKI_PROVIDER=gemini`, `OPENWIKI_MODEL=gemini-3.6-flash`, `GEMINI_API_KEY` (mapped from `secrets.OPENWIKI_GEMINI_API_KEY`), and `OPENWIKI_TELEMETRY_DISABLED=true`.
- **How to trigger:** use the scheduled Sunday 12:00 UTC run or launch the workflow manually with `workflow_dispatch`. Manual validation must be done on a pushed branch revision with GitHub Actions credentials available; local runs cannot exercise the hosted dispatch path end to end.
- **Validated locally from current workflow logic:** the guardrail step was reproduced against the checked-out repository state.
  - Clean repo: no changed paths remained and the guardrail reported `has_changes=false`.
  - Allowed change: a temporary file under `openwiki/` was detected and the guardrail reported `has_changes=true`.
  - Disallowed path: a temporary file outside the allowlist produced a non-zero exit and listed the invalid path.
- **Expected output when changes exist:** OpenWiki writes documentation updates under `openwiki/**` and may also update `AGENTS.md` or `.github/workflows/refresh-documentation.yml`, then opens or updates the `docs/codebase-refresh-documentation` PR with the `docs(documentation): 📝 refresh documentation with openwiki` commit message.
- **Expected output when nothing changes:** the PR creation/update step is skipped when `has_changes=false` and no PR is created or updated.
- **Evidence:** see issue #111 comment: https://github.com/JimmyPaolini/codebase/issues/111#issuecomment-5080422933
- **Troubleshooting:** if the run fails with a missing-key error, verify the `OPENWIKI_GEMINI_API_KEY` secret is present and correctly mapped to `GEMINI_API_KEY` in the workflow environment. If the guardrail fails, inspect the diff for files outside `openwiki/**`, `AGENTS.md`, or `.github/workflows/refresh-documentation.yml`. `CLAUDE.md` is explicitly reverted before the allowlist check.

---

#### 10. Upgrade Dependencies (`upgrade-dependencies.yml`)

**Name:** 🧑‍🚒 Upgrade Dependencies

**Triggers:** Weekly (Sunday 10am UTC), manual dispatch

**Jobs:**

- **upgrade-dependencies** - Upgrades pnpm (self-update), Node.js (via nvm LTS, writes `.nvmrc`), Python (via uv), all Node.js dependencies (`nx run codebase:upgrade-dependencies:write`), and Python dependencies (`uv lock --upgrade`). If any changes are detected, closes the existing `chore/dependencies-upgrade` PR and opens a new GPG-signed one with labels `dependencies`, `automated` assigned to `JimmyPaolini`

**Permissions:** `contents: write`, `pull-requests: write`

**Concurrency:** Cancels in-progress runs for the same branch

---

## Workflow Architecture

### Concurrency Strategy

All workflows use concurrency groups keyed by `${{ github.workflow }}-${{ github.ref }}` with `cancel-in-progress: true`. This ensures only one run per branch per workflow, canceling older runs when new commits are pushed.

### Affected Commands

Most workflows use `nx affected -t <target>` which only runs tasks on projects changed since the base branch. The `nrwl/nx-set-shas` action in `setup-codebase` automatically determines the correct base SHA (`NX_BASE`) and head SHA (`NX_HEAD`) for comparison.

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
         - uses: ./.github/actions/setup-codebase
         - run: npx nx affected -t <target> --parallel=3
   ```

3. Follow the emoji naming convention used by existing workflows
4. Use `nx affected` for project-specific tasks and `nx run codebase:<target>` for workspace-level tasks
