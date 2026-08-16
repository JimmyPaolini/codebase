---
argument-hint: "Optional: paste failure logs, or specify a workflow name / run URL to fetch"
agents: []
description: "Diagnose and fix failing GitHub Actions CI workflows in this codebase. Use when a CI check fails on a pull request or push, when you see red checks in GitHub Actions, when asked to fix CI, debug a workflow failure, or investigate a failing job. Accepts logs pasted directly in chat OR retrieves them automatically via the gh CLI. Triages failures for: lint-codebase (typecheck, lint, format, spell-check, knip, markdown-lint, yaml-lint, conformetry, synchronization), test-coverage, validate-conventions (branch name, PR title/body, config sync), scan-security (gitleaks, bandit, dependency audit, licenses, trivy), and make-projects (builds, bundle sizes, devcontainer image)."
disable-model-invocation: false
handoffs:
  - label: Clarify CI Context
    agent: question-me
    prompt: "Clarify the expected behavior, missing context, or intended outcome before continuing CI triage."
    send: false
  - label: Triage Submission
    agent: triage-submission
    prompt: "Also triage any local submission failures (commit or push hooks)."
    send: false
model: Auto (copilot)
name: triage-deployment
tools:
  - read
  - execute
  - search
  - web
user-invocable: true
---

# Triage CI Failures

Diagnose failing GitHub Actions workflows in this codebase, map errors to their root causes, read the relevant configuration, apply targeted fixes, and verify locally.

## When to Use

- A CI check is red on a pull request or push
- The user pastes GitHub Actions log output and asks for a fix
- A `gh` run or workflow URL is provided for inspection
- Asked to "fix CI", "debug the failing check", or "triage CI errors"

## Step 1: Obtain the Logs

### Option A — Specific logs provided in context

If the user has pasted log output or given a specific run URL in `$ARGUMENTS`, fetch only that run and skip to [Step 2](#step-2-identify-the-workflow-and-failing-job):

```bash
# e.g. https://github.com/JimmyPaolini/codebase/actions/runs/12345678
gh run view 12345678 --log-failed
```

### Option B — No logs provided: fetch ALL failing runs for the current PR

When no logs are provided, list all failing checks on the current PR and retrieve logs for each. Work through each failure in sequence — do not stop after the first fix.

```bash
# List all failing checks on the current PR (name + run URL)
gh pr checks --json name,state,link \
  --jq '.[] | select(.state == "FAILURE") | "\(.name) \(.link)"'
```

Parse the run ID from each link (last path segment of the URL) and fetch its logs:

```bash
gh run view <run-id> --log-failed
```

For **each** failing run, fetch its logs:

```bash
gh run view <run-id> --log-failed
```

Process all failing runs before moving to Step 4. Each failure may require a separate fix — apply them all before verifying.

## Step 2: Identify the Workflow and Failing Job

Match the log header against the known workflows:

| Workflow name             | Job name               | Trigger                                                |
| ------------------------- | ---------------------- | ------------------------------------------------------ |
| `🧑‍💻 Lint Codebase`        | `lint-codebase`        | push / PR / manual                                     |
| `🧑‍🔬 Test Coverage`        | `test-coverage`        | push / PR / manual                                     |
| `🧑‍⚖️ Validate Conventions` | `validate-conventions` | PR (opened/sync/edited) / push to main                 |
| `🕵️ Scan Security`        | `scan-security`        | push / PR / weekly schedule                            |

Identify which **step** within the job failed (visible in the log as `##[error]` or step exit code `!= 0`).

## Step 3: Triage by Workflow

### 🧑‍💻 Lint Codebase — `pnpm exec nx affected --target=lint-codebase`

The `lint-codebase` target is an `nx:noop` whose `dependsOn` leaves do the work. Identify which sub-target failed:

| Sub-target      | Underlying tool   | Config file                                                                                                                                                                                         |
| --------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typecheck`     | `tsc --noEmit`    | Per-project `tsconfig.json`, base: [configuration/tsconfig.base.json](../../../configuration/tsconfig.base.json)                                                                                    |
| `lint`          | ESLint            | Per-project `eslint.config.ts`, base: [configuration/eslint.config.ts](../../../configuration/eslint.config.ts)                                                                                     |
| `format`        | prettier + oxfmt  | [configuration/prettier.config.ts](../../../configuration/prettier.config.ts), [configuration/oxfmt.config.ts](../../../configuration/oxfmt.config.ts), [.prettierignore](../../../.prettierignore) |
| `spell-check`   | cspell            | [configuration/cspell.config.yaml](../../../configuration/cspell.config.yaml)                                                                                                                       |
| `knip`          | knip              | [configuration/knip.config.ts](../../../configuration/knip.config.ts)                                                                                                                               |
| `markdown-lint` | markdownlint-cli2 | `.markdownlint.json` (workspace root)                                                                                                                                                               |
| `yaml-lint`     | yamllint          | [configuration/yamllint.yaml](../../../configuration/yamllint.yaml)                                                                                                                                 |
| `type-coverage` | type-coverage     | Per-project `package.json` scripts                                                                                                                                                                  |

**Common fixes:**

- **`typecheck`**: Add proper types, null checks, fix imports. Never use `any` — use `unknown` or proper typing.
  > **Lesson**: Due to strict rules, array/object indexing (`items[0]`) returns `undefined` (use `?.` or `??`), `any` is strictly forbidden, functions must have explicit return types, and type-only imports must use `import { type X }` (`verbatimModuleSyntax`).
- **`lint`**: Apply the ESLint rule fix. Only use `// eslint-disable-next-line` when no code fix is possible.
  > **Lesson**: ESLint v9 flat config `files` arrays do NOT support brace expansion. `files: ['**/*.{json}']` will NOT match `package.json` — this silently prevents all rules in that config block from applying (e.g., `@nx/dependency-checks` `ignoredDependencies`). Use `files: ['**/*.json']` (no braces) for single-extension patterns.
- **`format`**: Run `pnpm exec nx affected -t format` to auto-fix. Do NOT hand-edit formatted output.
- **`spell-check`**: Fix typos, or add legitimate technical words to `configuration/cspell.config.yaml` under `words`.
  > **Lesson**: cspell does NOT auto-discover `configuration/cspell.config.yaml` (it is not in cspell's standard discovery path). The `--config configuration/cspell.config.yaml` flag must always be passed explicitly with workspaceRoot as CWD. Project-specific targets that run from a different CWD must use a relative path: `--config ../../configuration/cspell.config.yaml`.
- **`knip`**: Remove the unused export/import, or add to `ignoreDependencies` / `ignore` in `configuration/knip.config.ts`.
  > **Lesson**: String-referenced dependencies in config files (like `@commitlint/config-conventional` or `stylelint-config-standard`) are invisible to Knip and will be flagged as unused. Add them explicitly to `ignoreDependencies`.
- **`markdown-lint`**: Fix against [configuration/.markdownlint-cli2.jsonc](../../../configuration/.markdownlint-cli2.jsonc) rules — check MD049 style (`underscore`), MD013 line length, and fenced code block languages.
  > **Lesson**: If MD049 violations appear _after_ running the formatter — oxfmt/prettier converts `*emphasis*` → `_emphasis_`. The `.markdownlint-cli2.jsonc` MD049 rule must use `style: underscore` (not `asterisk`) to match formatter output; using `asterisk` will conflict on every formatted file.
- **`yaml-lint`**: Fix indentation, trailing spaces, or document-start issues as reported.

**Verify:**

```bash
pnpm exec nx affected -t lint-codebase
```

---

### 🧑‍🔬 Test Coverage — `nx affected --target=vitest --parallel=3 --configuration=coverage`

Coverage reports are uploaded as artifacts (`coverage-reports`).

**Triage steps:**

1. Identify the **failing test** name and **assertion error** in the log output.
2. Locate the test file (`*.unit.test.ts`, `*.integration.test.ts`, `*.end-to-end.test.ts`).
3. Read the test and implementation side-by-side.
4. Fix the implementation logic, test expectation, or update snapshots.

**Config pointers:**

- Vitest base config: [configuration/vitest.config.ts](../../../configuration/vitest.config.ts)
- Per-project vitest config: `<project>/vitest.config.ts`
- Coverage thresholds: check `vitest.config.ts` in the failing project for `coverage.thresholds`

**Verify:**

```bash
pnpm exec nx affected -t vitest --configuration=coverage --parallel=3
```

---

### 🧑‍⚖️ Validate Conventions

Each step is independent. Identify which step failed:

#### 🎋 Validate Branch Name

Config: [validate-branch-name.config.cjs](../../../validate-branch-name.config.cjs)

Required format: `<type>/<scope>-<description>` (e.g., `feat/lexico-user-auth`)

Fix: Load and follow the [checkout-branch skill](../checkout-branch/SKILL.md) to rename the branch correctly.

#### 📝 Validate Pull Request Title

Config: [configuration/commitlint.config.ts](../../../configuration/commitlint.config.ts)

Required format: `<type>(<scope>): <gitmoji> <subject>` (max 128 chars, lowercase imperative subject)

Fix: Update the PR title in the GitHub UI.

#### 🪢 Validate Pull Request Body

Template: [.github/PULL_REQUEST_TEMPLATE.md](../../PULL_REQUEST_TEMPLATE.md)

Required sections (exact heading text): `## 🌰 Summary`, `## 📝 Details`, `## 🧪 Testing`, `## 🔗 Related`

Fix: Edit the PR description in the GitHub UI to include all four sections.

#### 🏛️ Validate Convention Configuration

Failing command: `npx nx run synchronization:start:conventional-config-check`

Config: [scripts/sync-conventional-config.ts](../../../scripts/sync-conventional-config.ts)

Fix: Run `npx nx run synchronization:start:conventional-config-write` and commit the generated changes.

#### 📋 Validate Pull Request Template

Failing command: `npx nx run synchronization:start:pull-request-template-check`

Fix: Run `npx nx run synchronization:start:pull-request-template-write` and commit.

#### 🎯 Validate Agent Skills

Failing command: `npx nx run synchronization:start:agent-skills-check`

Fix: Run `npx nx run synchronization:start:agent-skills-write` and commit.

---

### 🕵️ Audit Security

Each step runs independently:

#### 🚰 Gitleaks Check — `nx run codebase:gitleaks --configuration=ci`

Config: [configuration/gitleaks.toml](../../../configuration/gitleaks.toml)

Fix: Remove the detected secret from the source file. If it is a false positive, add an `[allowlist]` entry to `gitleaks.toml` with a targeted `regexes` or `paths` rule.

**Never** commit credentials — rewrite history if necessary.

#### 🥷 Bandit Security Scan — `nx affected --target=bandit`

Config: [pyproject.toml](../../../pyproject.toml) (`[tool.bandit]`)

Fix: Address the reported security issue (e.g., use `secrets.token_hex()` instead of `random`, parameterize SQL queries). Use `# nosec <code>` only when justified with a comment.

#### 📚 Dependency Audit — part of `nx affected --target=scan-security`

Fix: Upgrade the vulnerable dependency to a patched version, or add a `pnpm audit --ignore` entry if no fix is available and the risk is accepted.

#### 🏗 Trivy Infrastructure Scan

Config: [configuration/trivyignore](../../../configuration/trivyignore)

Scan target: [infrastructure/terraform/](../../../infrastructure/terraform/)

Fix: Address the CRITICAL/HIGH finding in the Terraform config, or add a scoped entry to `trivyignore` with a justification comment.

---

### 🧑‍🔧 Make Codebase

Triggered only when `.devcontainer/**` files change (or on manual dispatch). Each step is independent:

#### 🧩 Check VSCode Extensions — `nx run codebase:sync-vscode-extensions:check`

Config: [scripts/sync-vscode-extensions.ts](../../../scripts/sync-vscode-extensions.ts)

Source: [.vscode/extensions.json](../../../.vscode/extensions.json), [.devcontainer/local/devcontainer.json](../../../.devcontainer/local/devcontainer.json)

Fix: Run `npx nx run codebase:sync-vscode-extensions` and commit the generated changes.

#### 🔧 Docker Build — `devcontainers/ci@v0.3` (Make Codebase step)

Config: [.devcontainer/cloud/devcontainer.json](../../../.devcontainer/cloud/devcontainer.json)

Image: `ghcr.io/jimmypaolini/codebase-devcontainer` (pushed to GHCR on `main` only)

Common failures:

- **Dockerfile syntax error**: Check the Dockerfile referenced in `devcontainer.json`
- **Missing dependency**: Add the package to the Dockerfile `RUN` layer
- **GHCR auth failure**: `packages: write` permission is required — check workflow permissions
- **Build cache miss causing timeout**: Increase runner resources or optimize layer order

#### 🔬 Test Devcontainer — `bash .devcontainer/scripts/test-devcontainer.sh`

Script: [.devcontainer/scripts/test-devcontainer.sh](../../../.devcontainer/scripts/test-devcontainer.sh)

Fix: Read the test script, identify the failing assertion, and fix the devcontainer configuration or Dockerfile.

---

## Step 4: Apply the Fix

1. Read the relevant source and config files before editing.
2. Apply the smallest change that resolves the error.
3. Follow [AGENTS.md](../../../AGENTS.md) conventions (strict TypeScript, explicit return types, no `any`, `consistent-type-imports`).
4. **Do not commit or push** — hand back to the user for review.

## Step 5: Verify Locally

Run the equivalent Nx target before handing back:

```bash
# Analyze code
pnpm exec nx affected -t lint-codebase

# Test coverage
pnpm exec nx affected -t vitest --configuration=coverage --parallel=3

# Validate conventions (config sync checks only)
npx nx run synchronization:start:conventional-config-check
npx nx run synchronization:start:pull-request-template-check
npx nx run synchronization:start:agent-skills-check

# Security
pnpm exec nx run codebase:gitleaks
pnpm exec nx affected -t scan-security
```

## Root Cause & Prevention

> **You are in triage mode because a proactive validation step was skipped before the commit or push.**
>
> After resolving these CI failures, remind the user: **use the [validate-code skill](../validate-code/SKILL.md) after every implementation task to catch these issues locally before they reach CI.**

Specifically, after every implementation task:

```bash
# Auto-fix format, lint, and unused-code issues
pnpm exec nx affected --target=lint-codebase --configuration=write --base=main

# Verify all checks pass — do not push until this is clean
pnpm exec nx affected --target=lint-codebase --configuration=check --base=main
```

Running this loop locally catches 100% of `lint-codebase` CI failures — typecheck, lint, format, spell-check, unused code, and sync checks — without waiting for CI to report them.

## Step 6: Report Errors Found and Fixes Implemented

**The skill ends here. Do NOT do anything else.**

At the end of the run, report a summary to the user covering:

1. **Errors found** — for each failing workflow/job/step, state:
   - Which workflow and job/step failed
   - The specific error message or rule violation that was triaged

2. **Fixes implemented** — for each fix, state:
   - Whether it was an auto-fix command or a manual code/configuration edit
   - Which files were modified

3. **Validation** — for each fix, state:
   - The command(s) run to validate the fix
   - The pass/fail result for each command

4. **Remaining actions** — list any unresolved items requiring user action, or explicitly state all failures are resolved.

Use this report template:

```text
Errors Found
- <workflow>: <job/step> — <error message>

Fixes Implemented
- <auto-fix command and/or manual change>
- Files changed: <file list>

Validation
- <check command> — ✅ PASSED

Remaining Actions
- <none | explicit follow-up actions>
```
