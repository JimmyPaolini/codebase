---
name: triage-integration
description: "Diagnose and fix codebase integration failures, whether they occur locally (husky pre-commit/pre-push hooks, lint-staged) or remotely (GitHub Actions CI workflows). Use when a commit is rejected, a push fails, or a CI check goes red. Retrieves logs automatically and provides specific fixes for lint-codebase (typecheck, eslint, oxfmt, knip, spell-check), test-coverage, sync checks, and conventions."
argument-hint: "Optional: paste failure logs, or specify a workflow name / run URL to fetch"
---

# Triage Integration Failures

Diagnose failing integration checks in this codebase—whether they occur locally during `git commit` / `git push` or remotely in GitHub Actions CI workflows. Map errors to their root causes, read the relevant configuration, apply targeted fixes, and verify locally.

## When to Use

- A `git commit` or `git push` is rejected by a local hook (Husky, lint-staged, commitlint, validate-branch-name).
- A CI check is red on a pull request or push.
- The user pastes error logs and asks for a fix.
- Asked to "fix CI", "debug the failing check", or "triage submission errors".

## Step 1: Obtain the Logs

Determine if this is a local failure or a CI failure.

### Option A: Local Submission Failure

If a `git commit` or `git push` failed and the user didn't paste the logs, read the last recorded output from the pre-commit hook:

```bash
cat last-lint-staged-output.log
```
*(This file is written automatically after every commit attempt at the workspace root).*

### Option B: CI Workflow Failure

If the user gave a specific run URL or log output in `$ARGUMENTS`, fetch only that run:

```bash
gh run view <run-id> --log-failed
```

If no logs are provided, fetch ALL failing runs for the current PR:

```bash
gh pr checks --json name,state,link \
  --jq '.[] | select(.state == "FAILURE") | "\(.name) \(.link)"'
```
Parse the `<run-id>` from the link and fetch the logs for each failure.

## Step 2: Identify the Failing Target

Read the error output carefully to determine:
- Which **Nx target** failed (e.g., `oxfmt`, `eslint`, `typecheck`, `spell-check`)
- Which **project(s)** failed (e.g., `lexico`, `caelundas`, `codebase`)
- The **specific error messages** from the underlying tool

### Step 3: Locate Relevant Configuration

Use the table below to find the exact config file and command for the failing tool. Read the config file before proposing a fix.

#### `prettier` and `oxfmt` (formatting — no composite `format` target exists)

Both are independent leaf targets that `lint-codebase` depends on directly.

| Target     | Check command                                                                                                                               | Write command       | Config file                                                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prettier` | `prettier --check --config configuration/prettier.config.ts --ignore-path configuration/.prettierignore {projectRoot}` (cwd: workspaceRoot) | same with `--write` | [configuration/prettier.config.ts](../../../configuration/prettier.config.ts), [configuration/.prettierignore](../../../configuration/.prettierignore) |
| `oxfmt`    | `oxfmt -c configuration/oxfmt.config.ts --ignore-path configuration/.oxfmtignore --check {projectRoot}` (cwd: workspaceRoot)                | same with `--write` | [configuration/oxfmt.config.ts](../../../configuration/oxfmt.config.ts)                                                                                |

Python projects run `ruff-format` instead — `uv run ruff format --check .` (cwd: projectRoot),
config: [pyproject.toml](../../../pyproject.toml)

#### `eslint` and `oxlint` (linting — no composite `lint` target exists)

Both are independent leaf targets that `lint-codebase` depends on directly.

| Target   | Check command                                                                                                                     | Write command     | Config file                                                                                                        |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `eslint` | `eslint . {args}` (cwd: projectRoot)                                                                                              | same with `--fix` | project `eslint.config.ts` which extends [configuration/eslint.config.ts](../../../configuration/eslint.config.ts) |
| `oxlint` | `oxlint --config configuration/oxlint.config.ts --ignore-path configuration/.oxlintignore {projectRoot}/src` (cwd: workspaceRoot) | same with `--fix` | [configuration/oxlint.config.ts](../../../configuration/oxlint.config.ts)                                          |

Python projects run `ruff-lint` instead — `uv run ruff check .` (cwd: projectRoot), config:
[pyproject.toml](../../../pyproject.toml)

#### `typecheck`

| Project type       | Command                                   | Config                                                                                              |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TypeScript         | `tsc --noEmit` (cwd: projectRoot)         | project `tsconfig.json` extends [configuration/tsconfig.json](../../../configuration/tsconfig.json) |
| Python (`pyright`) | `uv run pyright src/` (cwd: projectRoot)  | [pyproject.toml](../../../pyproject.toml)                                                           |
| Python (`ty`)      | `uv run ty check src/` (cwd: projectRoot) | [pyproject.toml](../../../pyproject.toml)                                                           |

#### `spell-check`

Command: `cspell --config configuration/cspell.config.yaml '{projectRoot}/**/*.{ts,tsx,js,...,py,ipynb}' --no-progress --gitignore` (cwd: workspaceRoot)
Config: [configuration/cspell.config.yaml](../../../configuration/cspell.config.yaml)

#### `markdown-lint`

|       | Command                                                                                                          | Config                                                                                    |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| check | `markdownlint-cli2 --config configuration/.markdownlint-cli2.jsonc '{projectRoot}/**/*.md'` (cwd: workspaceRoot) | [configuration/.markdownlint-cli2.jsonc](../../../configuration/.markdownlint-cli2.jsonc) |
| write | same with `--fix`                                                                                                |                                                                                           |

#### `yaml-lint`

Command: `uv run --project configuration yamllint -c configuration/yamllint.yaml '{projectRoot}'` (cwd: workspaceRoot)
Config: [configuration/yamllint.yaml](../../../configuration/yamllint.yaml)

#### `stylelint`

|       | Command                                                                                         | Config                                                                            |
| ----- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| check | `stylelint --config ../../configuration/stylelint.config.cjs 'src/**/*.css'` (cwd: projectRoot) | [configuration/stylelint.config.cjs](../../../configuration/stylelint.config.cjs) |
| write | same with `--fix`                                                                               |                                                                                   |

#### `knip` and `vulture` (dead-code detection — no composite `clean` target exists)

`knip` runs on TypeScript projects and `vulture` on Python projects; there is no `clean` target
on any project.

| Target             | Check command                                                                                | Config                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `knip` (TS)        | `knip --config configuration/knip.config.ts --workspace {projectRoot}` (cwd: workspaceRoot)  | [configuration/knip.config.ts](../../../configuration/knip.config.ts)                                                     |
| `vulture` (Python) | `uv run python -m vulture src/ .vulture_whitelist.py --min-confidence 80` (cwd: projectRoot) | project `.vulture_whitelist.py`, global [configuration/vulture_whitelist.py](../../../configuration/vulture_whitelist.py) |

#### `nbstripout` (affirmations only — Jupyter notebooks)

Strips cell outputs from `.ipynb` files before staging. Runs automatically on `*.ipynb` staged files.
Config: [applications/affirmations/project.json](../../../applications/affirmations/project.json)

#### Sync checks

Every synchronization command is its own Nx target on the `synchronization` project — `conformetry-generators`, `conventional-config`, `devcontainer-configuration`, `pull-request-template`, and `skill-exclusions` — run directly rather than through a shared aggregate, the same way `codebase:codometer` and `codebase:callidescope` are run. There is no `sync-*` target, no `scripts/sync-*.ts` script, and no `synchronization:synchronize` aggregate target — those were retired when the work moved into [tools/synchronization](../../../tools/synchronization). `lint-codebase`'s dependents name each derivation target directly.

The `nestjs-module-graphs` and `nx-project-graphs` targets were retired too, per issue #296: [codependix](../../../packages/ic-suite/codependix/codependix-cli) now derives the same NestJS module graphs and Nx neighborhood graphs through its own anchor blocks, checked by `nx run codebase:codependix` instead.

| Check command                                             | Write command           | What it validates                                                                                                                                           |
| --------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nx run synchronization:conformetry-generators:check`     | `:write`                | AGENTS.md generators table matches [configuration/conformetry.config.ts](../../../configuration/conformetry.config.ts)                                      |
| `nx run synchronization:conventional-config:check`        | `:write`                | Types/scopes consistent across [configuration/conventional.config.cjs](../../../configuration/conventional.config.cjs), `.vscode/settings.json`, skill docs |
| `nx run synchronization:devcontainer-configuration:check` | `:write`                | Cloud and local devcontainer configs share common fields                                                                                                    |
| `nx run synchronization:pull-request-template:check`      | `:write`                | [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md) in sync with skills and prompts                                               |
| `nx run synchronization:skill-exclusions:check`           | `:write`                | Installed-skill exclusion lists match `skills-lock.json`                                                                                                    |
| `nx run codebase:sync-vscode-extensions:check`            | `:write`                | `.vscode/extensions.json` matches devcontainer extension lists                                                                                              |
| `nx run codebase:codependix --configuration=check`        | `--configuration=write` | Each project's README codependix blocks match its real Nx, NestJS, and import graphs                                                                        |

> **Lesson**: If sync checks fail, it means a source of truth was edited without updating its counterpart. Example: editing `configuration/conformetry.config.ts` requires regenerating the `AGENTS.md` generators table. Editing `configuration/conventional.config.cjs` requires regenerating `.vscode/settings.json`, the PR template, and the types/scopes tables in AGENTS.md and the branch and commit skills.

There is no command that regenerates a skills table of contents. The synchronization module that once maintained the `AGENTS.md` skills list was retired along with the list itself: agents are handed the installed skills directly, so reading [.agents/skills](../../../.agents/skills) is what tells you which ones exist. A new skill needs no synchronization run — a skill added to `skills-lock.json` does, because `skill-exclusions` derives the exclusion blocks from it.

#### `check-lockfile` (package.json / pnpm-workspace.yaml changes)

Command: `validation lockfile`, the [lockfile](../../../tools/validation/src/modules/lockfile/lockfile.command.ts) check

lint-staged runs it as the CLI directly rather than through its `codebase:check-lockfile` Nx target, so one command does not cost another project graph build. Run it by hand through the target:

```bash
pnpm exec nx run codebase:check-lockfile
```

#### `commitlint` (commit-msg hook)

Command: `NODE_OPTIONS='--import=tsx' commitlint --config configuration/commitlint.config.ts --edit <msg-file>`
Config: [configuration/commitlint.config.ts](../../../configuration/commitlint.config.ts)



---

## Step 3: Apply Targeted Fixes

#### ⚠️ CRITICAL RULE: Validate Fixes But Never Run lint-staged

**After applying fixes with `--configuration=write`, you MUST:**
- ❌ **DO NOT** run `lint-staged` (this would stage the unstaged fixes, defeating the purpose)
- ❌ **DO NOT** run `git commit`
- ❌ **DO NOT** run `git push`
- ❌ **DO NOT** invoke submit, checkout-branch, or create-pull-request skills
- ✅ **DO** validate that fixes work by running the exact failing Nx target with `--configuration=check`
- ✅ **DO** leave all modified files **unstaged** so the user can review and stage them

#### Auto-Fixable Targets (run `--configuration=write`)

For these targets, run the Nx target with `--configuration=write` to auto-fix. Do NOT stage the modified files — leave them unstaged so the user can review the changes before staging.

```bash
# Format errors (oxfmt, prettier — no composite `format` target exists)
pnpm exec nx affected --target=oxfmt,prettier --configuration=write --files=<staged-files>

# Lint errors with auto-fix (ESLint --fix, oxlint --fix — no composite `lint` target exists)
pnpm exec nx affected --target=eslint,oxlint --configuration=write --files=<staged-files>

# Markdown lint with auto-fix
pnpm exec nx affected --target=markdown-lint --configuration=write --files=<staged-files>

# Unused code (knip --fix, vulture whitelist — no composite `clean` target exists)
pnpm exec nx affected --target=knip,vulture --configuration=write --files=<staged-files>

# Sync checks: run the write configuration to regenerate the out-of-sync file
pnpm exec nx run synchronization:conformetry-generators:write
pnpm exec nx run synchronization:conventional-config:write
pnpm exec nx run synchronization:devcontainer-configuration:write
pnpm exec nx run synchronization:pull-request-template:write
pnpm exec nx run synchronization:skill-exclusions:write
pnpm exec nx run codebase:sync-vscode-extensions:write
pnpm exec nx run codebase:codependix --configuration=write

# Or every derivation at once
pnpm exec nx run-many --targets=conformetry-generators,conventional-config,devcontainer-configuration,pull-request-template,skill-exclusions --configuration=write
```


#### Validate Fixes Passed

After applying fixes with `--configuration=write`, run the exact failing target with `--configuration=check` to confirm the fixes work. Use the same `--files` argument as the original failing lint-staged run:

```bash
# Validate format fixes worked
pnpm exec nx affected --target=oxfmt,prettier --configuration=check --files=<staged-files>

# Validate lint fixes worked
pnpm exec nx affected --target=eslint,oxlint --configuration=check --files=<staged-files>

# Validate markdown-lint fixes worked
pnpm exec nx affected --target=markdown-lint --configuration=check --files=<staged-files>

# Validate knip/vulture fixes worked
pnpm exec nx affected --target=knip,vulture --configuration=check --files=<staged-files>

# Validate sync checks fixed themselves (re-run the check configuration)
pnpm exec nx run-many --targets=conformetry-generators,conventional-config,devcontainer-configuration,pull-request-template,skill-exclusions --configuration=check
pnpm exec nx run codebase:sync-vscode-extensions:check
```

**If all `--configuration=check` commands pass**, the fixes are confirmed working. Proceed to Step 5.

**If a `--configuration=check` command still fails**, review the error output and apply additional manual fixes as needed, then re-validate that target.

> ✅ **Best practice:** Re-run the exact original composite `nx affected --target=... --configuration=check --files=...` command after each fix batch. A first pass may reveal additional lint/type errors hidden behind the first failure, so continue iterating until the full original command is green.

#### Manual Fix Required

| Failing target                                 | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typecheck`                                    | Read the TypeScript/Python errors. **TS**: Use optional chaining `array[0]?.property` for index access, avoid `any`, require explicit function return types, and use `import { type Foo }` for type-only imports. **Python**: Note that `[tool.ty]` config must remain in the project-level `pyproject.toml` (not workspace root).                                                                                                                                                               |
| `spell-check`                                  | Either fix the typo, or if it's a valid word (false negative), add it to the most relevant dictionary in `configuration/.cspell/` (e.g. `lexico.txt`, `tooling.txt`). If a suitable category doesn't exist, create a new dictionary file in `configuration/.cspell/`, register it in `configuration/cspell.config.yaml`, and refactor existing dictionaries to move any relevant words into the new dictionary. As a fallback, add it directly to `words` in `configuration/cspell.config.yaml`. |
| `markdown-lint` (`MD024/no-duplicate-heading`) | Check whether duplicate headings also contain duplicate content. If content is verbatim duplicated, remove only the extra block. If content differs, keep both content blocks and rename one heading to a distinct, specific title.                                                                                                                                                                                                                                                              |
| `yaml-lint`                                    | Fix YAML syntax errors per `configuration/yamllint.yaml` rules.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `stylelint`                                    | Fix CSS issues per `configuration/stylelint.config.cjs`.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `check-lockfile`                               | Run `pnpm install` to regenerate `pnpm-lock.yaml`. Do NOT stage the lockfile — leave it unstaged for the user to review. **Lesson**: Any manual change to a `package.json` or workspace config often requires this.                                                                                                                                                                                                                                                                              |
| `commitlint`                                   | Fix the commit message. See format below.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `validate-branch-name`                         | Rename the branch with `git branch -m <new-valid-name>`. See format above.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `vulture` (Python)                             | Fix the flagged unused code, or add a `# noqa` comment. The project-local `.vulture_whitelist.py` and global `configuration/vulture_whitelist.py` are both read. Min-confidence is 80.                                                                                                                                                                                                                                                                                                           |

#### Invalid Branch Name (pre-push hook)

Required format: `<type>/<scope>-<description>`

- **type** and **scope**: see [Valid Types and Scopes](#valid-types-and-scopes) below
- **description**: lowercase kebab-case (e.g., `user-auth`, `fix-build-script`)

Exempt branches (no validation): `main`, `copilot/*`, `dependabot/*`, `renovate/*`

To fix, rename the current branch:

```bash
git branch -m <new-valid-name>
# example:
git branch -m feat/lexico-user-auth
```

Read [validate-branch-name.config.cjs](../../../validate-branch-name.config.cjs) to see the full regex and error message.

#### Commitlint Errors (commit-msg hook)

Required format: `<type>(<scope>): <gitmoji> <subject>`

- **type** and **scope**: see [Valid Types and Scopes](#valid-types-and-scopes) below
- **gitmoji**: Required emoji at the start of the subject (e.g., ✨ `feat`, 🐛 `fix`, 📝 `docs`, ✅ `test`, ♻️ `refactor`, ⚡️ `perf`, 🔧 `chore`, 👷 `ci`, ⬆️ deps)
- **subject**: lowercase, imperative mood, no period, max 128 chars total
- No body or footer — all context in the subject

Read `configuration/commitlint.config.ts` for the full rule set before amending.


#### Valid Types and Scopes

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

<!-- scopes-start -->

| Scope | Description |
| ----- | ----------- |
| `ic-suite` | In-house code measurement and validation toolchains (Callidescope, Codependix, Codometer, Conformetry) and their shared conventions |
| `affirmations` | Python Jupyter notebook application for LangGraph affirmation generation |
| `caelundas` | Node.js CLI for astronomical calendar generation (NASA JPL ephemeris) |
| `configuration` | Workspace root config files (tsconfig, eslint, vitest, nx.json, etc.) |
| `conformetry` | Code generator templates and validation tests for generated instances |
| `dependencies` | Dependency version changes (upgrades, additions, removals via pnpm) |
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
