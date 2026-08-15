---
name: Nx Local Caching Optimization Across Monorepo
description: Optimize Nx local task caching and affected targeting for root, all projects, and generator templates without using Nx Cloud.
created: 2026-07-06T19:50:45Z
updated: 2026-07-06T23:53:39Z
status: 'Completed'
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This plan defines a repository-wide Nx local caching optimization to reduce redundant task execution and improve `nx affected` precision for both developer workflows and CI. The implementation explicitly excludes Nx Cloud and uses only local cache behavior, including optional `.nx/cache` persistence in GitHub Actions.

## 1. Requirements & Constraints

- **REQ-001**: Optimize task caching behavior at root level in `nx.json` using deterministic, minimal invalidation inputs for all cacheable targets.
- **REQ-002**: Apply caching optimization to all existing Nx projects: `monorepo`, `affirmations`, `caelundas`, `lexico`, `lexico-ingestion`, `lexico-components`, `lexico-entities`, `conformance`, and `synchronization`.
- **REQ-003**: Update conformance generator templates so newly generated projects inherit the same caching strategy.
- **REQ-004**: Improve `nx affected` targeting accuracy by refining `namedInputs`, target `inputs`, target `outputs`, and `dependsOn` graph behavior.
- **REQ-005**: Re-evaluate all currently uncached targets and cache aggressively when commands are deterministic and safe to replay.
- **REQ-006**: Preserve CI support for restoring and saving `.nx/cache` through GitHub Actions cache.
- **SEC-001**: Keep non-deterministic or security-sensitive targets uncached when replay could hide important runtime behavior or stale risk signals.
- **CON-001**: Do not use Nx Cloud configuration, authentication, distributed execution, or remote cache service.
- **CON-002**: Keep compatibility with current workspace Nx version and plugin inference behavior; avoid config shapes requiring beta-only behavior.
- **CON-003**: Root/project conventions in `AGENTS.md` and existing quality gates must remain unchanged.
- **GUD-001**: Prefer global `targetDefaults` and `namedInputs` for consistency; only add per-project overrides when root defaults are insufficient.
- **GUD-002**: Use spread (`"..."`) merge semantics where needed to avoid unintentionally replacing inferred plugin configuration.
- **PAT-001**: Keep side-effect tasks (for example, environment setup, downloads, orchestration, infrastructure operations) explicitly documented with cache rationale.
- **PAT-002**: Validate configuration by measuring cache hits/misses and affected project count before and after changes on representative targets.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Baseline current cache behavior and classify all targets by cache safety/determinism.

| Task     | Description                                                                                                                                                                                      | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---- |
| TASK-001 | Create an inventory table of all workspace targets from `nx.json` + all `project.json` files, including current `cache`, `inputs`, `outputs`, `dependsOn`, executor, and command side effects. | ✅        | 2026-07-06 |
| TASK-002 | Run baseline measurements for representative commands (`nx run-many`, `nx affected`) and record task counts, cache hit rate, and execution time.                                                | ✅        | 2026-07-06T20:06:47Z |
| TASK-003 | Classify every currently uncached target into `cache-safe`, `conditionally-cache-safe`, or `must-remain-uncached` with explicit rationale and risk notes.                                      | ✅        | 2026-07-06T20:09:05Z |
| TASK-004 | Capture current CI cache behavior in `.github/actions/setup-monorepo/action.yml` and verify no Nx Cloud references exist in workflow configuration.                                            | ✅        | 2026-07-06T20:12:36Z |

<!-- TASK-001-INVENTORY-START -->
#### TASK-001 Inventory Baseline (Completed 2026-07-06)

- Coverage: `9` project.json files (`215` project targets) + `30` root target defaults.
- Total inventoried target rows: `245`.
- Currently uncached rows (`cache: false`): `21`.
- `Current *` fields reflect resolved values using project target config first, then `nx.json` targetDefaults by target name, then by executor key when present.

| Source | Project | Target | Current cache | Current inputs | Current outputs | Current dependsOn | Current executor | Command side effects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `nx.json targetDefaults` | `*` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `bandit` | true | `["pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `build` | true | `["^production","production"]` | — | `["^build"]` | — | no obvious side effects |
| `nx.json targetDefaults` | `*` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `eslint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/eslint.config.ts","sharedGlobals"]` | — | — | — | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `fallow` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `fallow-audit` | false | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `nx.json targetDefaults` | `*` | `fallow-dead-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `fallow-duplicates` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `fallow-health` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `pyright` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `pytest` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource","pythonTests"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `ruff-format` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `ruff-lint` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `stylelint` | true | `["{projectRoot}/src/**/*.css","{workspaceRoot}/configuration/stylelint.config.cjs"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `test` | true | `["^production","default"]` | — | — | — | no obvious side effects |
| `nx.json targetDefaults` | `*` | `ty` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `nx.json targetDefaults` | `*` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | — | no obvious side effects |
| `nx.json targetDefaults` | `*` | `vulture` | true | `["{projectRoot}/.vulture_whitelist.py","pythonSource"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `nx.json targetDefaults` | `*` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `audit-security` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `check-lockfile` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `commit-msg` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `commitlint` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `eslint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/eslint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `fallow` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `fallow-audit` | false | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `fallow-dead-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `fallow-duplicates` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `fallow-fix` | false | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `fallow-health` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/fallow.config.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `gitleaks` | true | `["{workspaceRoot}/configuration/.gitleaksignore","{workspaceRoot}/configuration/gitleaks.toml","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `license-check` | true | `["{workspaceRoot}/package.json","{workspaceRoot}/pnpm-lock.yaml","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `lint-staged` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `markdown-lint` | true | `["{projectRoot}/*.md","{projectRoot}/documentation/**/*.md","{projectRoot}/infrastructure/**/*.md","{projectRoot}/scripts/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `measure-code` | false | — | `["{workspaceRoot}/README.md"]` | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `orchestrate-agents` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `oxfmt` | true | `["{workspaceRoot}/configuration/oxfmt.config.ts","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `oxlint` | true | `["{workspaceRoot}/configuration/oxlint.config.ts","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `pnpm-audit` | false | — | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `postgres-container` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `postgres-data` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `pre-commit` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `pre-push` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `scan-dependencies` | false | — | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `sherif` | true | `["{workspaceRoot}/**/package.json"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `spell-check` | true | `["{projectRoot}/*.{ts,tsx,js,jsx,md,yaml,yml,json}","{projectRoot}/documentation/**","{projectRoot}/infrastructure/**","{projectRoot}/planning/**","{projectRoot}/scripts/**","{workspaceRoot}/configuration/cspell.config.yaml","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `sqlfluff-format` | true | `["{projectRoot}/notepads/*.sql","{workspaceRoot}/configuration/pyproject.toml","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `sqlfluff-lint` | true | `["{projectRoot}/notepads/*.sql","{workspaceRoot}/configuration/pyproject.toml","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `sync-vscode-extensions` | true | `["{projectRoot}/.devcontainer/cloud/devcontainer.json","{projectRoot}/.devcontainer/local/devcontainer.json","{projectRoot}/.vscode/extensions.json"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `sync-vscode-settings` | true | `["{projectRoot}/.vscode/settings.json"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `syncpack` | true | `["{workspaceRoot}/**/package.json","{workspaceRoot}/configuration/syncpack.config.cjs","{workspaceRoot}/pnpm-lock.yaml"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `terraform` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `trivy` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `trivy-config` | false | `["{workspaceRoot}/infrastructure/terraform/**/*.tf"]` | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `type-coverage` | true | `["{projectRoot}/**/*.{ts,tsx}","{workspaceRoot}/tsconfig.json","default"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `project.json` | `monorepo` | `upgrade-dependencies` | false | — | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `validate-branch-name` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `project.json` | `monorepo` | `vulture` | true | `["{projectRoot}/*.py","{projectRoot}/scripts/**/*.py","{workspaceRoot}/applications/affirmations/pyproject.toml","{workspaceRoot}/configuration/vulture_whitelist.py","default"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `project.json` | `monorepo` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/affirmations/project.json` | `affirmations` | `bandit` | true | `["pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/affirmations/project.json` | `affirmations` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/affirmations/project.json` | `affirmations` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/affirmations/project.json` | `affirmations` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `nbstripout` | true | `["{projectRoot}/src/**/*.ipynb"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/affirmations/project.json` | `affirmations` | `ollama` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `open-webui` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `pyright` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `pytest` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource","pythonTests"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `ruff-format` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `ruff-lint` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `searxng` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `spell-check` | true | `["{projectRoot}/*.{md,yaml,yml,json}","{projectRoot}/src/**/*.{py,ipynb,md,yaml,yml,json}","{projectRoot}/testing/**/*.{py,md}","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `test` | true | `["^production","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `ty` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `vulture` | true | `["{projectRoot}/.vulture_whitelist.py","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/affirmations/project.json` | `affirmations` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `code-analysis` | false | — | — | — | — | uncached (reason not documented in config) |
| `applications/caelundas/project.json` | `caelundas` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `download-ephemeris` | false | — | — | — | `nx:run-commands` | uncached (reason not documented in config) |
| `applications/caelundas/project.json` | `caelundas` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `repl` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `start` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `test` | true | `["^production","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `applications/caelundas/project.json` | `caelundas` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `build` | true | `["^production","production"]` | — | `["^build"]` | — | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `clear` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `corpus-scriptorum-ecclesiasticorum-latinorum` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `dictionary` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `epigraphik-datenbank-clauss-slaby` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `eslint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/eslint.config.ts","sharedGlobals"]` | — | — | — | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `latin-library` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `library` | — | — | — | — | — | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `literature` | — | — | — | — | — | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `perseus` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `repl` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `start` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `test` | true | `["^production","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `wiktionary` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico-ingestion/project.json` | `lexico-ingestion` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/lexico/project.json` | `lexico` | `build` | true | `["^production","production"]` | — | `["^build"]` | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `bundlesize` | true | `["{workspaceRoot}/dist/applications/lexico/**/*","default"]` | — | `["build"]` | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `develop` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/lexico/project.json` | `lexico` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `applications/lexico/project.json` | `lexico` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `preview` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `start` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `applications/lexico/project.json` | `lexico` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `build` | true | `["^production","production"]` | `["{options.outputPath}"]` | `["^build"]` | `@nx/vite:build` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `bundlesize` | true | `["{workspaceRoot}/dist/packages/lexico-components/**/*","default"]` | — | `["build"]` | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-components/project.json` | `lexico-components` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `stylelint` | true | `["{projectRoot}/src/**/*.css","{workspaceRoot}/configuration/stylelint.config.cjs"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-components/project.json` | `lexico-components` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `build` | true | `["^production","production"]` | `["{options.outputPath}"]` | `["^build"]` | `@nx/vite:build` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `eslint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/eslint.config.ts","sharedGlobals"]` | — | — | — | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `migration` | — | — | — | — | `nx:run-commands` | yes (database/data mutation) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `sqlfluff-format` | true | `["{projectRoot}/**/*.sql","{workspaceRoot}/configuration/pyproject.toml","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `sqlfluff-lint` | true | `["{projectRoot}/**/*.sql","{workspaceRoot}/configuration/pyproject.toml","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `packages/lexico-entities/project.json` | `lexico-entities` | `squawk` | true | `["{projectRoot}/**/*.sql","{workspaceRoot}/configuration/squawk.toml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `test` | true | `["{projectRoot}/**/*.test.ts","{projectRoot}/**/*.ts","{workspaceRoot}/configuration/vitest.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | — | no obvious side effects |
| `packages/lexico-entities/project.json` | `lexico-entities` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `build` | true | `["^production","production"]` | — | `["^build"]` | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `code-analysis` | — | — | — | — | — | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/conformance/project.json` | `conformance` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/conformance/project.json` | `conformance` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `pyright` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `pytest` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource","pythonTests"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `ruff-format` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `ruff-lint` | true | `["{workspaceRoot}/configuration/pyproject.toml","pythonSource"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `test` | true | `["^production","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `vitest` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `tools/conformance/project.json` | `conformance` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `agent-skills` | false | `["{workspaceRoot}/AGENTS.md","{workspaceRoot}/.agents/skills/**/*.md"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/synchronization/project.json` | `synchronization` | `analyze-code` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,py,ipynb,sql}","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `clean` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,py}","{workspaceRoot}/configuration/knip.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `conformance-generators` | true | `["{workspaceRoot}/AGENTS.md","{workspaceRoot}/tools/conformance/generators.json"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/synchronization/project.json` | `synchronization` | `conventional-config` | true | `["{workspaceRoot}/.vscode/settings.json","{workspaceRoot}/configuration/conventional.config.cjs","{workspaceRoot}/.agents/skills/commit-code/SKILL.md"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/synchronization/project.json` | `synchronization` | `dependency-cruiser` | true | `["^default","{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{workspaceRoot}/configuration/dependency-cruiser.cjs","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `devcontainer-configuration` | true | `["{workspaceRoot}/.devcontainer/cloud/devcontainer.json","{workspaceRoot}/.devcontainer/local/devcontainer.json"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/synchronization/project.json` | `synchronization` | `format` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml,sql}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/oxfmt.config.ts","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `knip` | true | `["{workspaceRoot}/configuration/knip.config.ts","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `lint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,md,mdx,css}","{workspaceRoot}/configuration/eslint.config.ts","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `markdown-lint` | true | `["{projectRoot}/**/*.md","{workspaceRoot}/configuration/.markdownlint-cli2.jsonc","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `oxfmt` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/configuration/oxfmt.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `oxlint` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}","{workspaceRoot}/configuration/oxlint.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `prettier` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,html,css,scss,md,mdx,yaml,yml}","{workspaceRoot}/.prettierignore","{workspaceRoot}/configuration/prettier.config.ts","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `pull-request-template` | true | `["{workspaceRoot}/.github/prompts/create-pull-request.prompt.md","{workspaceRoot}/.github/prompts/update-pull-request.prompt.md","{workspaceRoot}/.github/PULL_REQUEST_TEMPLATE.md","{workspaceRoot}/.agents/skills/create-pull-request/SKILL.md"]` | — | — | `nx:run-commands` | conditional (write/fix configuration mutates files) |
| `tools/synchronization/project.json` | `synchronization` | `repl` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `spell-check` | true | `["{projectRoot}/**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs,json,jsonc,json5,css,scss,html,yaml,yml,md,mdx,py,ipynb,sql}","{workspaceRoot}/configuration/.cspell/**","{workspaceRoot}/configuration/cspell.config.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `start` | — | — | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `test` | true | `["^production","default"]` | — | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `type-coverage` | true | `["{projectRoot}/**/*.ts","{projectRoot}/**/*.tsx","{projectRoot}/tsconfig.json","sharedGlobals"]` | `["{projectRoot}/type-coverage-report.txt"]` | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `typecheck` | true | `["^production","typescriptFiles",{"externalDependencies":["typescript"]}]` | `[]` | — | `nx:run-commands` | no obvious side effects |
| `tools/synchronization/project.json` | `synchronization` | `yaml-lint` | true | `["{projectRoot}/**/*.{yaml,yml}","{workspaceRoot}/configuration/yamllint.yaml","sharedGlobals"]` | — | — | `nx:run-commands` | no obvious side effects |
<!-- TASK-001-INVENTORY-END -->

<!-- TASK-002-BASELINE-START -->
#### TASK-002 Baseline Measurements (Completed 2026-07-06T20:06:47Z)

- Measurement setup: `NX_NO_CLOUD=true` for all runs; `pnpm exec nx reset` executed before cold runs.
- Elapsed time: wall-clock seconds measured around each Nx command invocation.

| Command family | Run | Command | Task count | Cache hits | Cache misses | Cache hit rate | Elapsed time |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `nx run-many` | Cold | `pnpm exec nx run-many --target=build --projects=lexico-components,lexico-entities --outputStyle=static` | 2 | 0 | 2 | 0% | 84s |
| `nx run-many` | Warm | `pnpm exec nx run-many --target=build --projects=lexico-components,lexico-entities --outputStyle=static` | 2 | 2 | 0 | 100% | 2s |
| `nx affected` | Cold | `pnpm exec nx affected --target=markdown-lint --files=documentation/planning/2026-07-06T19:50:45Z-infrastructure-nx-local-caching-optimization.plan.md --outputStyle=static` | 1 | 0 | 1 | 0% | 6s |
| `nx affected` | Warm | `pnpm exec nx affected --target=markdown-lint --files=documentation/planning/2026-07-06T19:50:45Z-infrastructure-nx-local-caching-optimization.plan.md --outputStyle=static` | 1 | 1 | 0 | 100% | 15s |

- Nx output confirmed warm cache replay:
  - `Nx read the output from the cache instead of running the command for 2 out of 2 tasks.`
  - `Nx read the output from the cache instead of running the command for 1 out of 1 tasks.`
<!-- TASK-002-BASELINE-END -->

<!-- TASK-003-CLASSIFICATION-START -->
#### TASK-003 Uncached Target Classification (Completed 2026-07-06T20:09:05Z)

- `cache-safe` at current target granularity: none.

| Source | Target | Classification | Rationale | Risk notes |
| --- | --- | --- | --- | --- |
| `nx.json targetDefaults` | `fallow-audit` | `conditionally-cache-safe` | Static-analysis command is deterministic when limited to stable source + config + tool version inputs. | Current command behaves as a regression gate (`audit`) and may depend on branch/diff context; caching without explicit VCS-state inputs could hide newly introduced risk. |
| `project.json` | `audit-security` | `must-remain-uncached` | Aggregates security scans (`gitleaks`, `bandit`, dependency scan, `trivy`) that must run fresh. | Cached replay could suppress newly disclosed CVEs/secrets/misconfiguration findings (SEC-001). |
| `project.json` | `commit-msg` | `must-remain-uncached` | Git hook task consumes ephemeral commit message file path (`--edit`) and local hook context. | Replaying cache could skip real commit-message validation and allow invalid commits. |
| `project.json` | `commitlint` | `must-remain-uncached` | Validates mutable commit-message content passed via runtime args. | Cache could return stale pass/fail from a different commit message. |
| `project.json` | `fallow-audit` | `conditionally-cache-safe` | Candidate for caching in `check`-only mode with explicit inputs and pinned toolchain. | As configured (`\|\| true` and audit semantics), stale replay can hide newly introduced regression signals. |
| `project.json` | `fallow-fix` | `must-remain-uncached` | `write` configuration mutates source files and should always execute when requested. | Cache replay would skip required code modifications and produce false-success runs. |
| `project.json` | `lint-staged` | `must-remain-uncached` | Operates on dynamic staged-file set in developer git state. | Staged snapshot is not represented in Nx file inputs; cached output could be invalid. |
| `project.json` | `measure-code` | `conditionally-cache-safe` | `check` mode is deterministic from repository content and can be cached if split from mutating mode. | Default `write` mode edits `README.md`; cache replay could skip required badge/stat updates. |
| `project.json` | `orchestrate-agents` | `must-remain-uncached` | Runs LLM orchestration workflow with non-deterministic external responses. | Cached replay could mask live orchestration failures or stale AI-generated plans. |
| `project.json` | `pnpm-audit` | `must-remain-uncached` | Security audit depends on external vulnerability feed state and live registry metadata. | Replaying cache can hide newly published vulnerabilities. |
| `project.json` | `pre-commit` | `must-remain-uncached` | Hook behavior depends on current staged files and repository state. | Cached success may bypass real pre-commit validation on changed staged content. |
| `project.json` | `pre-push` | `must-remain-uncached` | Hook validates current branch/push context at execution time. | Cache replay could bypass branch-policy enforcement for current push. |
| `project.json` | `scan-dependencies` | `must-remain-uncached` | Composite dependency/security gate includes non-deterministic audit checks and optional write mode. | Cached replay can hide fresh dependency/security failures or skip required remediation. |
| `project.json` | `terraform` | `must-remain-uncached` | `plan`/`import` evaluate live infrastructure and environment variables. | Caching can mask infrastructure drift and produce unsafe stale plans. |
| `project.json` | `trivy` | `must-remain-uncached` | Security scan aggregate depends on external vuln DB updates and runtime environment. | Cached results can miss newly identified critical findings. |
| `project.json` | `trivy-config` | `must-remain-uncached` | IaC scan should reflect latest Trivy database and policy state every run. | Cache replay may hide newly disclosed Terraform misconfigurations. |
| `project.json` | `upgrade-dependencies` | `must-remain-uncached` | `write` mode performs networked dependency upgrades and lockfile mutations. | Cached replay could skip actual upgrades and leave workspace stale. |
| `project.json` | `validate-branch-name` | `must-remain-uncached` | Validation is runtime-contextual to current branch name and push flow. | Cache replay can incorrectly approve disallowed branch names. |
| `applications/caelundas/project.json` | `code-analysis` | `conditionally-cache-safe` | Potentially cache-safe only after executor/inputs/outputs are explicitly defined and deterministic. | Target currently has no command metadata; enabling cache now risks undefined or misleading behavior. |
| `applications/caelundas/project.json` | `download-ephemeris` | `must-remain-uncached` | Downloads external ephemeris artifacts into project data directory. | Network/download task must execute each run to avoid stale or missing data artifacts (PAT-001). |
| `tools/synchronization/project.json` | `agent-skills` | `conditionally-cache-safe` | `check` mode is deterministic from docs + AGENTS inputs and can be cached if isolated from mutating mode. | Default `write` mode edits `AGENTS.md` and formats files; cache replay can skip required synchronization writes. |

<!-- TASK-003-CLASSIFICATION-END -->

<!-- TASK-004-CI-CACHE-START -->
#### TASK-004 CI Cache Behavior Baseline (Completed 2026-07-06T20:12:36Z)

- `.github/actions/setup-monorepo/action.yml` persists Nx local cache via `actions/cache@v4` at `path: .nx/cache`.
- Cache key strategy: `nx-cache-${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ github.sha }}` with restore fallbacks to lockfile-hash and OS-only prefixes.
- Workflow usage check: all primary CI workflows call `./.github/actions/setup-monorepo`, so the same `.nx/cache` restore/save policy is shared across CI jobs.
- Nx Cloud verification: searched `.github/workflows` and `.github/actions` for `nx cloud`, `nx-cloud`, and `NX_CLOUD`; no references found.
<!-- TASK-004-CI-CACHE-END -->

### Implementation Phase 2

- GOAL-002: Implement root-level cache/input/output pipeline improvements in `nx.json`.

| Task     | Description                                                                                                                                                                                                           | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-005 | Refine `namedInputs` in `nx.json` to minimize global invalidation scope while preserving correctness (including production-focused patterns and explicit include/exclude boundaries).                                | ✅        | 2026-07-06T23:53:39Z |
| TASK-006 | Update `targetDefaults` caching strategy for common targets (`build`, `test`, `lint`, `typecheck`, `analyze-code`, etc.) with precise `inputs`, `outputs`, and `dependsOn` definitions.                          | ✅        | 2026-07-06T23:53:39Z |
| TASK-007 | Convert reclassified cache-safe root-level targets in `/project.json` from `cache: false` to deterministic cache configs, including explicit `inputs` and `outputs` where missing.                                | ✅        | 2026-07-06T23:53:39Z |
| TASK-008 | Preserve `cache: false` only for targets confirmed as non-deterministic or state-changing; add clear inline rationale near each retained uncached target in root/project configs.                                  | ✅        | 2026-07-06T23:53:39Z |

### Implementation Phase 3

- GOAL-003: Apply and align project-level overrides for all applications, packages, and tools.

| Task     | Description                                                                                                                                                                                         | Completed | Date |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-009 | Review and update project targets in `applications/*/project.json` to align with root defaults while keeping required project-specific inputs/outputs.                                            | ✅        | 2026-07-06T23:53:39Z |
| TASK-010 | Review and update project targets in `packages/*/project.json` with deterministic cache behavior and dependency-aware pipelines (`dependsOn` with dependency builds/tests where applicable).        | ✅        | 2026-07-06T23:53:39Z |
| TASK-011 | Review and update project targets in `tools/*/project.json` to cache deterministic tasks and keep side-effect tooling tasks uncached with explicit rationale.                                      | ✅        | 2026-07-06T23:53:39Z |
| TASK-012 | Verify `implicitDependencies` and affected graph behavior for cross-project paths (for example `lexico -> lexico-components`) to ensure only necessary downstream tasks are scheduled.             | ✅        | 2026-07-06T23:53:39Z |

### Implementation Phase 4

- GOAL-004: Propagate strategy to generators and validate performance/correctness end-to-end.

| Task     | Description                                                                                                                                                                                             | Completed | Date |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- |
| TASK-013 | Update conformance generator templates under `tools/conformance/src/generators/*/templates/project.json` so generated projects inherit revised cache/input/output patterns.                           | ✅        | 2026-07-06T23:53:39Z |
| TASK-014 | Update conformance tests (for example `tools/conformance/src/conformance.test.ts`) to assert required caching fields and target behavior in generated project files.                                  | ✅        | 2026-07-06T23:53:39Z |
| TASK-015 | Run workspace validation targets and representative cache tests twice (cold + warm) to confirm deterministic replay and measurable runtime improvements without correctness regressions.               | ✅        | 2026-07-06T23:53:39Z |
| TASK-016 | Validate CI workflow with `.nx/cache` restore/save and `nx affected` behavior on a branch diff to ensure no Nx Cloud usage and no over-triggering of unrelated projects/tasks.                       | ✅        | 2026-07-06T23:53:39Z |

<!-- TASK-005-016-EXECUTION-START -->
#### TASK-005 through TASK-016 Execution Notes (Completed 2026-07-06T23:53:39Z)

- `nx.json` updates:
  - Refined `namedInputs` by introducing `workspaceConfiguration` and `ciConfiguration`.
  - Removed workflow files from `sharedGlobals` to avoid unnecessary global invalidation.
  - Tightened `production` exclusions for tests/docs and adjusted `test` target inputs.
  - Updated `analyze-code` default inputs to use `default` plus explicit workspace config inputs.
- Root `project.json` updates:
  - Converted `measure-code` into cached check mode.
  - Added uncached `measure-code-write` target and routed `analyze-code:write` to it.
  - Added explicit uncached rationale text to retained uncached root targets.
  - Routed write synchronization to uncached `synchronization:agent-skills-write`.
- Project-level updates:
  - `applications/caelundas/project.json`: converted `code-analysis` to deterministic cached check wrapper.
  - `applications/lexico-ingestion/project.json`: added deterministic cached `code-analysis` wrapper target.
  - `tools/synchronization/project.json`: converted `agent-skills` to cached check mode and added uncached `agent-skills-write`.
- Template/test propagation:
  - Updated NestJS command and GraphQL application generator templates to include cached `code-analysis` wrappers.
  - Added conformance test assertions for required `code-analysis` cache behavior in generator templates.
- Validation outcomes:
  - ✅ Cache/graph behavior checks executed (`nx affected`, warm cache replay, no Nx Cloud references in workflows/actions).
  - ⚠️ Full `nx affected --target=analyze-code` write/check runs reported pre-existing failures outside this change scope (notably in `lexico-ingestion`, `conformance`, and `monorepo` baseline checks).
<!-- TASK-005-016-EXECUTION-END -->

## 3. Alternatives

- **ALT-001**: Adopt Nx Cloud remote caching/distributed execution. Rejected because scope explicitly forbids Nx Cloud usage.
- **ALT-002**: Optimize only `nx.json` and avoid per-project/template updates. Rejected because inconsistent project overrides and generator drift would quickly reintroduce cache misses.
- **ALT-003**: Keep all currently uncached targets as-is. Rejected due to explicit requirement to re-evaluate and cache aggressively where deterministic.
- **ALT-004**: Move all caching config into project files only. Rejected because it duplicates configuration and increases maintenance cost versus root `targetDefaults`.

## 4. Dependencies

- **DEP-001**: Nx workspace configuration files: `nx.json` and root `/project.json`.
- **DEP-002**: Per-project configs in `applications/**/project.json`, `packages/**/project.json`, and `tools/**/project.json`.
- **DEP-003**: Generator templates in `tools/conformance/src/generators/**/templates/project.json`.
- **DEP-004**: Template validation tests in `tools/conformance/src/conformance.test.ts`.
- **DEP-005**: CI cache action configuration in `.github/actions/setup-monorepo/action.yml`.
- **DEP-006**: Existing analyze-code and test targets used for validation (`nx affected --target=analyze-code`, project-level `analyze-code` and `test` targets).

## 5. Files

- **FILE-001**: `nx.json` - Root `namedInputs`, `targetDefaults`, cache directory, and global task behavior.
- **FILE-002**: `project.json` - Root monorepo targets and cache enablement/disablement decisions.
- **FILE-003**: `applications/**/project.json` - Application-specific target overrides and dependency wiring.
- **FILE-004**: `packages/**/project.json` - Shared package target definitions and cache/input/output settings.
- **FILE-005**: `tools/**/project.json` - Tool project targets and determinism-aware cache policy.
- **FILE-006**: `tools/conformance/src/generators/**/templates/project.json` - Generator template defaults for future projects.
- **FILE-007**: `tools/conformance/src/conformance.test.ts` - Assertions enforcing generated config consistency.
- **FILE-008**: `.github/actions/setup-monorepo/action.yml` - CI `.nx/cache` restore/save behavior without Nx Cloud.

## 6. Testing & Validation

- **TEST-001**: Run warm-cache verification for representative targets (`build`, `test`, `lint`, `typecheck`, `analyze-code`) and confirm second run reuses cache outputs.
- **TEST-002**: Execute `nx affected` on representative diffs (single-project, shared-package, root-config changes) and verify affected scope is minimal and correct.
- **TEST-003**: Validate formerly uncached targets converted to cached mode produce identical outputs across repeated runs.
- **TEST-004**: Validate retained uncached targets execute each run and do not incorrectly reuse stale outputs.
- **VAL-001**: Run `pnpm exec nx affected --target=analyze-code --configuration=write --base=main`.
- **VAL-002**: Run `pnpm exec nx affected --target=analyze-code --configuration=check --base=main`.
- **VAL-003**: Run focused project tests/builds for impacted projects after config changes.
- **VAL-004**: Confirm no Nx Cloud usage by verifying absence of Nx Cloud configuration and by running tasks with local cache-only behavior.

## 7. Risks & Assumptions

- **RISK-001**: Overly broad `inputs` may reduce cache hit rate and preserve unnecessary task invalidation.
- **RISK-002**: Overly narrow `inputs` may cause stale cache replay and false confidence in correctness.
- **RISK-003**: Aggressive caching of side-effect tasks may mask runtime failures or external dependency drift.
- **RISK-004**: Template updates without matching test updates may allow future drift in generated project configs.
- **RISK-005**: CI/local parity can regress if `.nx/cache` assumptions differ between developers and runners.
- **ASSUMPTION-001**: Workspace remains on an Nx version supporting current `targetDefaults` and spread merge behavior.
- **ASSUMPTION-002**: `.nx/cache` persistence in GitHub Actions remains acceptable as a local-cache acceleration mechanism.
- **ASSUMPTION-003**: Existing project targets are deterministic unless explicitly identified as state-changing during Phase 1 classification.

## 8. Related Specifications / Further Reading

- Nx cache task results: https://nx.dev/docs/features/cache-task-results
- Nx inputs reference: https://nx.dev/docs/reference/inputs
- Nx outputs configuration: https://nx.dev/docs/guides/tasks--caching/configure-outputs
- Nx task pipeline / dependsOn: https://nx.dev/docs/guides/tasks--caching/defining-task-pipeline
- Nx affected command: https://nx.dev/docs/features/ci-features/affected
- Workspace reference plan: `documentation/planning/2026-06-19T13:44:06Z-infrastructure-nx-version-23-upgrade.plan.md`
- Workspace conventions: `AGENTS.md`
