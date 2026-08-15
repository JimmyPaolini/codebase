---
name: triage-submission
description: "Triage and fix git submission failures for both commits and pushes. Use when a git commit or push is rejected, when lint-staged errors occur, when pre-commit or pre-push hooks fail, when a branch name is invalid on push, or when you see errors from husky, commitlint, validate-branch-name, ESLint, oxfmt, prettier, typecheck, knip, cspell, markdownlint, or yamllint during a commit or push attempt. Reads the error output, identifies the failing hook and checks, reads the relevant configuration, and applies targeted fixes."
argument-hint: "Optional: paste the error output, or omit to read it from last-lint-staged-output.log"
---

# Triage Submission Failures

Diagnose and fix failures from the Husky pre-commit, commit-msg, and pre-push hooks in this codebase.

## When to Use

- A `git commit` was rejected by any hook
- A `git push` was rejected by any hook (branch name validation, pre-push checks)
- `lint-staged` output shows failing Nx targets
- Errors from tools like ESLint, oxfmt, prettier, oxlint, TypeScript, cspell, markdownlint, yamllint, knip, or vulture appear during a commit or push
- `commitlint` rejects the commit message format
- `validate-branch-name` rejects the current branch name on push
- Sync checks fail (agent skills, conventional config, PR template, devcontainer, lockfile)

## Hook Architecture

### pre-commit hook

File: [configuration/.husky/pre-commit](../../../configuration/.husky/pre-commit)

```sh
nx run codebase:lint-staged
# resolves to:
NODE_OPTIONS='--import=tsx' lint-staged --config configuration/lint-staged.config.ts --continue-on-error
```

lint-staged config: [configuration/lint-staged.config.ts](../../../configuration/lint-staged.config.ts)

For each pattern of staged files, lint-staged runs:

```bash
nx affected --target=<targets> --configuration=check --files=<comma-separated-staged-paths>
```

### commit-msg hook

File: [configuration/.husky/commit-msg](../../../configuration/.husky/commit-msg)

```sh
nx run codebase:commitlint --edit=$1
# resolves to:
NODE_OPTIONS='--import=tsx' commitlint --config configuration/commitlint.config.ts --edit <msg-file>
```

### pre-push hook

File: [configuration/.husky/pre-push](../../../configuration/.husky/pre-push)

```sh
nx run codebase:validate-branch-name
# resolves to:
validate-branch-name
# reads config from: validate-branch-name.config.cjs
```

Config: [validate-branch-name.config.cjs](../../../validate-branch-name.config.cjs)

### lint-staged file-type → target matrix

| Staged file pattern                                                              | `nx affected` targets                                                  |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------   |
| `*.ts, *.tsx, *.js, *.jsx, *.mts, *.cts, *.mjs, *.cjs`                           | `clean,format,lint,typecheck,spell-check`                              |
| `*.py`                                                                           | `clean,format,lint,spell-check,typecheck`                              |
| `*.ipynb`                                                                        | `nbstripout` (first), then `clean,format,lint,typecheck,spell-check`   |
| `*.json, *.jsonc, *.json5, *.html`                                               | `format,lint,spell-check`                                              |
| `*.css`                                                                          | `stylelint,format,lint,spell-check`                                    |
| `*.md, *.mdx`                                                                    | `format,lint,markdown-lint,spell-check`                                |
| `*.yml, *.yaml` (not pnpm-lock)                                                  | `format,yaml-lint,spell-check`                                         |
| `**/package.json`                                                                | `./scripts/check-lockfile.sh` (direct script, not Nx)                  |
| `pnpm-workspace.yaml`                                                            | `./scripts/check-lockfile.sh`                                          |
| `configuration/knip.config.ts`                                                   | `nx run codebase:clean:check`                                          |
| `.vscode/extensions.json`, `.devcontainer/local/devcontainer.json`               | `nx run codebase:sync-vscode-extensions:check`                         |
| `.devcontainer/cloud/devcontainer.json`, `.devcontainer/local/devcontainer.json` | `nx run synchronization:start:devcontainer-configuration-check`        |
| Conventional config files (see lint-staged.config.ts)                            | `nx run synchronization:start:conventional-config-check`               |
| PR template files                                                                | `nx run synchronization:start:pull-request-template-check`             |
| `AGENTS.md`, `documentation/skills/**/*.md`                                      | `nx run synchronization:start:agent-skills-check`                      |

## Triage Procedure

### Step 1: Identify the Failing Hook

Read the error output carefully. Determine which hook failed:

- **`pre-commit`** → lint-staged ran Nx targets on staged files
- **`commit-msg`** → commitlint rejected the commit message format
- **`pre-push`** → `validate-branch-name` rejected the current branch name

### Step 2: Read the Error Output

If the user did not paste error output, read the last recorded output from the pre-commit hook:

```bash
cat last-lint-staged-output.log
```

This file is written automatically after every commit attempt (git-ignored, workspace root).

Identify from the output:

- Which **Nx target** failed (e.g., `format`, `lint`, `typecheck`, `spell-check`)
- Which **project(s)** failed (e.g., `lexico`, `caelundas`, `codebase`)
- The **specific error messages** from the underlying tool

### Step 3: Locate Relevant Configuration

Use the table below to find the exact config file and command for the failing tool. Read the config file before proposing a fix.

#### `format` (composite: `prettier` + `oxfmt`)

| Sub-target | Check command                                                                                            | Write command       | Config file                                                                                                                |
| ---------- | -------------------------------------------------------------------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `prettier` | `prettier --check --config configuration/prettier.config.ts --ignore-path .prettierignore {projectRoot}` | same with `--write` | [configuration/prettier.config.ts](../../../configuration/prettier.config.ts), [.prettierignore](../../../.prettierignore) |
| `oxfmt`    | `oxfmt -c configuration/oxfmt.config.ts --check {projectRoot}` (cwd: workspaceRoot)                      | same with `--write` | [configuration/oxfmt.config.ts](../../../configuration/oxfmt.config.ts)                                                    |

Python projects: `format` runs `ruff format` (config: [configuration/pyproject.toml](../../../configuration/pyproject.toml))

#### `lint` (composite: `eslint` + `oxlint`)

| Sub-target | Check command                                                                           | Write command     | Config file                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| `eslint`   | `eslint . {args}` (cwd: projectRoot)                                                    | same with `--fix` | project `eslint.config.ts` which extends [configuration/eslint.config.ts](../../../configuration/eslint.config.ts) |
| `oxlint`   | `oxlint --config configuration/oxlint.config.ts {projectRoot}/src` (cwd: workspaceRoot) | same with `--fix` | [configuration/oxlint.config.ts](../../../configuration/oxlint.config.ts)                                          |

Python projects: `lint` runs `ruff check` (config: [configuration/pyproject.toml](../../../configuration/pyproject.toml))

#### `typecheck`

| Project type       | Command                                   | Config                                                                                              |
| ------------------ | ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TypeScript         | `tsc --noEmit` (cwd: projectRoot)         | project `tsconfig.json` extends [configuration/tsconfig.json](../../../configuration/tsconfig.json) |
| Python (`pyright`) | `uv run pyright src/` (cwd: projectRoot)  | [configuration/pyproject.toml](../../../configuration/pyproject.toml)                               |
| Python (`ty`)      | `uv run ty check src/` (cwd: projectRoot) | [configuration/pyproject.toml](../../../configuration/pyproject.toml)                               |

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

#### `clean` (composite: `knip` for TS, `vulture` for Python)

| Sub-target         | Check command                                                                                | Config                                                                                                                    |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `knip` (TS)        | `knip --config configuration/knip.config.ts --workspace {projectRoot}` (cwd: workspaceRoot)  | [configuration/knip.config.ts](../../../configuration/knip.config.ts)                                                     |
| `vulture` (Python) | `uv run python -m vulture src/ .vulture_whitelist.py --min-confidence 80` (cwd: projectRoot) | project `.vulture_whitelist.py`, global [configuration/vulture_whitelist.py](../../../configuration/vulture_whitelist.py) |

#### `nbstripout` (affirmations only — Jupyter notebooks)

Strips cell outputs from `.ipynb` files before staging. Runs automatically on `*.ipynb` staged files.
Config: [applications/affirmations/project.json](../../../applications/affirmations/project.json)

#### Sync checks

| Target                            | Check command                                          | Write command | What it validates                                                                                                                                           |
| --------------------------------- | ------------------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sync-agent-skills`               | `tsx scripts/sync-agent-skills.ts check`               | `...write`    | AGENTS.md skills ToC matches `documentation/skills/*/SKILL.md`                                                                                              |
| `sync-conformance-generators`     | `tsx scripts/sync-conformance-generators.ts check`     | `...write`    | AGENTS.md generators table matches `tools/conformance/generators.json`                                                                                      |
| `sync-conventional-config`        | `tsx scripts/sync-conventional-config.ts check`        | `...write`    | Types/scopes consistent across [configuration/conventional.config.cjs](../../../configuration/conventional.config.cjs), `.vscode/settings.json`, skill docs |
| `sync-pull-request-template`      | `tsx scripts/sync-pull-request-template.ts check`      | `...write`    | [.github/PULL_REQUEST_TEMPLATE.md](../../../.github/PULL_REQUEST_TEMPLATE.md) in sync with skills and prompts                                               |
| `sync-devcontainer-configuration` | `tsx scripts/sync-devcontainer-configuration.ts check` | `...write`    | Cloud and local devcontainer configs share common fields                                                                                                    |

> **Lesson**: If sync checks fail, it means a source of truth was edited without updating its counterpart. Example: editing `tools/conformance/generators.json` requires updating `AGENTS.md`. Editing `configuration/conventional.config.cjs` requires updating `.vscode/settings.json` and PR templates.
> | `sync-vscode-extensions` | `tsx .devcontainer/scripts/sync-vscode-extensions.ts check` | `...write` | `.vscode/extensions.json` matches devcontainer extension lists |

#### `check-lockfile` (package.json / pnpm-workspace.yaml changes)

Command: `bash scripts/check-lockfile.sh` (not an Nx target — run directly by lint-staged)
Script: [scripts/check-lockfile.sh](../../../scripts/check-lockfile.sh)

#### `commitlint` (commit-msg hook)

Command: `NODE_OPTIONS='--import=tsx' commitlint --config configuration/commitlint.config.ts --edit <msg-file>`
Config: [configuration/commitlint.config.ts](../../../configuration/commitlint.config.ts)

### Step 4: Apply Targeted Fixes

#### ⚠️ CRITICAL RULE: Validate Fixes But Never Run lint-staged

**After applying fixes with `--configuration=write`, you MUST:**

- ❌ **DO NOT** run `lint-staged` (this would stage the unstaged fixes, defeating the purpose)
- ❌ **DO NOT** run `git commit`
- ❌ **DO NOT** run `git push`
- ❌ **DO NOT** invoke submit, checkout-branch, or create-pull-request skills

**DO validate that fixes work:**

- ✅ Run the exact failing Nx target with `--configuration=check` to verify it passes now
- ✅ Example: if `format` failed, run `pnpm exec nx affected --target=format --configuration=check --files=<staged-files>`
- ✅ If validation passes, all fixes are confirmed working

**Then proceed:**

- ✅ Leave all modified files **unstaged**
- ✅ Go directly to Step 5 to summarize what was found and fixed
- ✅ Let the user review, stage, and commit the fixes themselves

#### Auto-Fixable Targets (run `--configuration=write`)

For these targets, run the Nx target with `--configuration=write` to auto-fix. Do NOT stage the modified files — leave them unstaged so the user can review the changes before staging.

```bash
# Format errors (oxfmt, prettier)
pnpm exec nx affected --target=format --configuration=write --files=<staged-files>

# Lint errors with auto-fix (ESLint --fix, oxlint --fix)
pnpm exec nx affected --target=lint --configuration=write --files=<staged-files>

# Markdown lint with auto-fix
pnpm exec nx affected --target=markdown-lint --configuration=write --files=<staged-files>

# Unused code (knip --fix, vulture whitelist)
pnpm exec nx affected --target=clean --configuration=write --files=<staged-files>

# Sync checks: run the write variant to regenerate the out-of-sync file
pnpm exec nx run synchronization:start:agent-skills-write
pnpm exec nx run synchronization:start:conventional-config-write
pnpm exec nx run synchronization:start:pull-request-template-write
pnpm exec nx run codebase:sync-vscode-extensions:write
pnpm exec nx run synchronization:start:devcontainer-configuration-write
```

#### Validate Fixes Passed

After applying fixes with `--configuration=write`, run the exact failing target with `--configuration=check` to confirm the fixes work. Use the same `--files` argument as the original failing lint-staged run:

```bash
# Validate format fixes worked
pnpm exec nx affected --target=format --configuration=check --files=<staged-files>

# Validate lint fixes worked
pnpm exec nx affected --target=lint --configuration=check --files=<staged-files>

# Validate markdown-lint fixes worked
pnpm exec nx affected --target=markdown-lint --configuration=check --files=<staged-files>

# Validate clean/knip fixes worked
pnpm exec nx affected --target=clean --configuration=check --files=<staged-files>

# Validate sync checks fixed themselves (re-run the check variant)
pnpm exec nx run synchronization:start:agent-skills-check
pnpm exec nx run synchronization:start:conventional-config-check
pnpm exec nx run synchronization:start:pull-request-template-check
pnpm exec nx run codebase:sync-vscode-extensions:check
pnpm exec nx run synchronization:start:devcontainer-configuration-check
```

**If all `--configuration=check` commands pass**, the fixes are confirmed working. Proceed to Step 5.

**If a `--configuration=check` command still fails**, review the error output and apply additional manual fixes as needed, then re-validate that target.

> ✅ **Best practice:** Re-run the exact original composite `nx affected --target=... --configuration=check --files=...` command after each fix batch. A first pass may reveal additional lint/type errors hidden behind the first failure, so continue iterating until the full original command is green.

#### Manual Fix Required

| Failing target                                 | What to do                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `typecheck`                                    | Read the TypeScript/Python errors. **TS**: Use optional chaining `arr[0]?.prop` for index access, avoid `any`, require explicit function return types, and use `import { type Foo }` for type-only imports. **Python**: Note that `[tool.ty]` config must remain in the project-level `pyproject.toml` (not workspace root).                                                                                                                                                                     |
| `spell-check`                                  | Either fix the typo, or if it's a valid word (false negative), add it to the most relevant dictionary in `configuration/.cspell/` (e.g. `lexico.txt`, `tooling.txt`). If a suitable category doesn't exist, create a new dictionary file in `configuration/.cspell/`, register it in `configuration/cspell.config.yaml`, and refactor existing dictionaries to move any relevant words into the new dictionary. As a fallback, add it directly to `words` in `configuration/cspell.config.yaml`. |
| `markdown-lint` (`MD024/no-duplicate-heading`) | Check whether duplicate headings also contain duplicate content. If content is verbatim duplicated, remove only the extra block. If content differs, keep both content blocks and rename one heading to a distinct, specific title.                                                                                                                                                                                                                                                              |
| `yaml-lint`                                    | Fix YAML syntax errors per `configuration/yamllint.yaml` rules.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `stylelint`                                    | Fix CSS issues per `configuration/stylelint.config.cjs`.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `check-lockfile`                               | Run `pnpm install` to regenerate `pnpm-lock.yaml`. Do NOT stage the lockfile — leave it unstaged for the user to review. **Lesson**: Any manual change to a `package.json` or workspace config often requires this.                                                                                                                                                                                                                                                                              |
| `commitlint`                                   | Fix the commit message. See format below.                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `validate-branch-name`                         | Rename the branch with `git branch -m <new-valid-name>`. See format above.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `clean` (Python/`vulture`)                     | Fix the flagged unused code, or add a `# noqa` comment. The project-local `.vulture_whitelist.py` and global `configuration/vulture_whitelist.py` are both read. Min-confidence is 80.                                                                                                                                                                                                                                                                                                           |

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
| `affirmations` | Python Jupyter notebook application for LangGraph affirmation generation |
| `applications` | Changes spanning multiple applications in applications/ (e.g. lexico, caelundas, etc.) |
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
| `codebase` | Workspace root concerns (pnpm-workspace, root package.json, Nx orchestration) |
| `no-release` | Escape hatch: suppress semantic-release for any commit type |
| `packages` | Changes spanning multiple shared packages in packages/ |
| `release` | Version bumps and release commits generated by semantic-release |
| `scripts` | Shell and TypeScript scripts in scripts/ (sync, setup, utilities) |
| `testing` | Vitest configuration, shared test utilities, and coverage setup |
| `tools` | Changes spanning multiple tool projects in tools/ |
| `synchronization` | Synchronization application and commands for automating workflows |

<!-- scopes-end -->

### Step 5: Report Errors Found and Fixes Implemented

**The skill ends here. Do NOT do anything else.**

At the end of the run, report a summary to the user covering:

1. **Errors found** — for each failing hook/target, state:
   - Which hook failed (`pre-commit`, `commit-msg`, or `pre-push`)
   - Which Nx target or tool produced the error (e.g., `eslint`, `oxfmt`, `typecheck`)
   - The specific error messages or rule violations

2. **Fixes implemented** — for each fix, state:
   - Whether it was an auto-fix command (e.g., `format --configuration=write`) or a manual code/configuration edit
   - Which files were modified (all left unstaged — the user must review and `git add` them before retrying the commit)

3. **Validation** — for each fix, state:
   - The command(s) run to validate the fix
   - The pass/fail result for each command

4. **Remaining actions** — if any issues require user action (e.g., manual typecheck fixes, commit message amend, branch rename), list them explicitly so the user knows what still needs to be done before committing. If all validations passed, state "All fixes validated. Ready to review, stage, and commit."

Use this report template:

```text
Errors Found
- <hook>: <target/tool> — <error message>

Fixes Implemented
- <auto-fix command and/or manual change>
- Files changed: <file list>

Validation
- <check command> — ✅ PASSED

Remaining Actions
- <none | explicit follow-up actions>
```

## Common Patterns

| Symptom                                   | Cause                                   | Fix                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Unexpected token`, `Expected whitespace` | oxfmt/prettier format check failed      | `nx affected --target=format --configuration=write`                                                                                                                                                                                                                                                                                                                                            |
| `error  ...  @typescript-eslint/...`      | ESLint rule violation                   | `nx affected --target=lint --configuration=write` or manual fix                                                                                                                                                                                                                                                                                                                                |
| `MD024/no-duplicate-heading`              | Duplicate markdown heading in same file | If duplicated content is identical, remove one block; if content differs, keep both and rename one heading                                                                                                                                                                                                                                                                                     |
| `Type 'X' is not assignable to 'Y'`       | TypeScript type error                   | Manual fix — check `tsconfig.json` strict settings                                                                                                                                                                                                                                                                                                                                             |
| `Unknown word` in cspell                  | Unrecognized word                       | Add it to the most relevant dictionary in `configuration/.cspell/` (e.g. `lexico.txt`, `tooling.txt`). If a suitable category doesn't exist, create a new dictionary file, register it in `configuration/cspell.config.yaml`, and refactor existing dictionaries to move any relevant words into the new dictionary. As a fallback, add it to `configuration/cspell.config.yaml` `words` list. |
| `lockfile needs update`                   | `pnpm-lock.yaml` out of sync            | `pnpm install` (leave lockfile unstaged for user to review)                                                                                                                                                                                                                                                                                                                                    |
| `sync check failed`                       | Generated file is out of date           | Run the corresponding `:write` target                                                                                                                                                                                                                                                                                                                                                          |
| `subject may not be empty`                | commitlint missing subject              | Amend commit message to correct format                                                                                                                                                                                                                                                                                                                                                         |
| Knip: `Unused export`                     | Export not used anywhere                | Remove export or add to knip `ignoreBinaries`/`ignoreExports`                                                                                                                                                                                                                                                                                                                                  |

## References

### Hooks

- [configuration/.husky/pre-commit](../../../configuration/.husky/pre-commit) — runs `nx run codebase:lint-staged`
- [configuration/.husky/commit-msg](../../../configuration/.husky/commit-msg) — runs `nx run codebase:commitlint`
- [configuration/.husky/pre-push](../../../configuration/.husky/pre-push) — runs `nx run codebase:validate-branch-name`
- [configuration/lint-staged.config.ts](../../../configuration/lint-staged.config.ts) — file-pattern → Nx target mapping
- [validate-branch-name.config.cjs](../../../validate-branch-name.config.cjs) — branch name regex, error message, exempt patterns
- [project.json](../../../project.json) — `lint-staged`, `commitlint`, and `validate-branch-name` target definitions
- [nx.json](../../../nx.json) — default target definitions for `format`, `lint`, `typecheck`, `spell-check`, `clean`, etc.

### Tool Configurations

| Tool                                | Config File                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| ESLint (base)                       | [configuration/eslint.config.ts](../../../configuration/eslint.config.ts)                                                  |
| oxlint                              | [configuration/oxlint.config.ts](../../../configuration/oxlint.config.ts)                                                  |
| oxfmt                               | [configuration/oxfmt.config.ts](../../../configuration/oxfmt.config.ts)                                                    |
| Prettier                            | [configuration/prettier.config.ts](../../../configuration/prettier.config.ts), [.prettierignore](../../../.prettierignore) |
| TypeScript (base)                   | [configuration/tsconfig.json](../../../configuration/tsconfig.json)                                                        |
| cspell                              | [configuration/cspell.config.yaml](../../../configuration/cspell.config.yaml)                                              |
| markdownlint                        | [configuration/.markdownlint-cli2.jsonc](../../../configuration/.markdownlint-cli2.jsonc)                                  |
| yamllint                            | [configuration/yamllint.yaml](../../../configuration/yamllint.yaml)                                                        |
| stylelint                           | [configuration/stylelint.config.cjs](../../../configuration/stylelint.config.cjs)                                          |
| knip                                | [configuration/knip.config.ts](../../../configuration/knip.config.ts)                                                      |
| Ruff + pyright                      | [configuration/pyproject.toml](../../../configuration/pyproject.toml)                                                      |
| commitlint                          | [configuration/commitlint.config.ts](../../../configuration/commitlint.config.ts)                                          |
| validate-branch-name                | [validate-branch-name.config.cjs](../../../validate-branch-name.config.cjs)                                                |
| Conventional commits (types/scopes) | [configuration/conventional.config.cjs](../../../configuration/conventional.config.cjs)                                    |
| check-lockfile                      | [scripts/check-lockfile.sh](../../../scripts/check-lockfile.sh)                                                            |

### Git Conventions

- [documentation/skills/commit-code/SKILL.md](../../../documentation/skills/commit-code/SKILL.md)
- [documentation/skills/checkout-branch/SKILL.md](../../../documentation/skills/checkout-branch/SKILL.md)
- [documentation/skills/create-pull-request/SKILL.md](../../../documentation/skills/create-pull-request/SKILL.md)
- [documentation/skills/update-pull-request/SKILL.md](../../../documentation/skills/update-pull-request/SKILL.md)
- [documentation/skills/submit-changes/SKILL.md](../../../documentation/skills/submit-changes/SKILL.md)

## Root Cause & Prevention

> **You are in triage mode because a proactive validation step was skipped.**
>
> After resolving these failures, remind the user: **use the [validate-code skill](../validate-code/SKILL.md) before committing to catch all of these issues before pre-commit hooks run.**

Specifically, after every implementation task:

```bash
# Auto-fix format, lint, and unused-code issues
pnpm exec nx affected --target=analyze-code --configuration=write --base=main

# Verify all checks pass — do not commit until this is clean
pnpm exec nx affected --target=analyze-code --configuration=check --base=main
```

Running this loop _before_ staging catches 100% of the pre-commit hook failures this skill handles — formatting, linting, typecheck, spell-check, unused code, and sync checks — without any pre-commit interruption.
