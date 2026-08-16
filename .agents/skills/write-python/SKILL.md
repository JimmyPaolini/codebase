---
name: write-python
description: Python project conventions for this codebase. Use when creating a new Python project, configuring Python tools (ruff, pyright, ty, pytest, bandit, vulture), writing or reviewing pyproject.toml, setting up Nx targets for Python, or asked about Python tooling setup, uv, or the language:python tag. Covers the project.json pattern, pyproject.toml structure, targetDefaults, tool execution via uv run, and ty pre-1.0 configuration rules.
license: MIT
---

# Write Python

All Python projects inherit configuration from the workspace root `pyproject.toml` and Nx `targetDefaults`. Use `uv run` (never `uvx`) for reproducible tool invocations pinned in `uv.lock`.

## Tool Targets

Seven Python tool targets are defined as codebase-wide `targetDefaults` in `nx.json`:

| Target | Tool | Purpose |
| ------ | ---- | ------- |
| `ruff-format` | ruff | Format Python source |
| `ruff-lint` | ruff | Lint Python source |
| `pyright` | pyright | Primary type checker (strict mode) |
| `pytest` | pytest | Run tests (unit/integration/coverage) |
| `vulture` | vulture | Dead code detection |
| `ty` | ty | Supplementary type checker (Astral, pre-1.0) |
| `bandit` | bandit | Security linter (CI `scan-security` only) |

## Project Tags

Every Python project must declare the `language:python` tag in `project.json`. This enables the correct composite target overrides (Python sub-targets instead of TypeScript ones).

```json
{
  "tags": ["language:python", "scope:<name>", "type:application"]
}
```

## project.json Pattern

Declare every sub-target as `{}` so Nx applies the `targetDefaults`. Override composite targets to compose the Python sub-targets:

```json
{
  "tags": ["language:python", "scope:my-app", "type:application"],
  "targets": {
    "format": {
      "configurations": {
        "check": { "commands": ["nx run {projectName}:ruff-format:check"], "parallel": true },
        "write": { "commands": ["nx run {projectName}:ruff-format:write"], "parallel": false }
      }
    },
    "lint": {
      "configurations": {
        "check": { "commands": ["nx run {projectName}:ruff-lint:check"], "parallel": true },
        "write": { "commands": ["nx run {projectName}:ruff-lint:write"], "parallel": false }
      }
    },
    "typecheck": {
      "executor": "nx:run-commands",
      "options": {
        "commands": ["nx run {projectName}:pyright", "nx run {projectName}:ty"],
        "parallel": true
      }
    },
    "test": {
      "executor": "nx:run-commands",
      "options": { "commands": ["nx run {projectName}:pytest"] },
      "configurations": {
        "unit": { "commands": ["nx run {projectName}:pytest:unit"] },
        "integration": { "commands": ["nx run {projectName}:pytest:integration"] },
        "coverage": { "commands": ["nx run {projectName}:pytest:coverage"] }
      }
    },
    "bandit": {},
    "pytest": {},
    "pyright": {},
    "ruff-format": {},
    "ruff-lint": {},
    "ty": {},
    "vulture": {}
  }
}
```

> Each sub-target declared as `{}` tells Nx "this project has this target — use the codebase default."

## pyproject.toml Pattern

```toml
[project]
name = "my-python-app"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [...]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src"]
reproducible = true

# Project-specific overrides only — base config inherited from root pyproject.toml
[tool.ruff]
exclude = ["notebooks/**", ".vulture_whitelist.py"]

[tool.pyright]
venvPath = "."
venv = ".venv"
reportMissingModuleSource = "none"

# ty: keep project-level until ty reaches 1.0 (do NOT add to root pyproject.toml)
[tool.ty.environment]
python-version = "3.11"

[tool.ty.analysis]
allowed-unresolved-imports = ["my_external_package.**"]

[tool.bandit]
exclude_dirs = ["testing", "output", "notebooks"]
skips = ["B101"]
```

## Root pyproject.toml

Located at `configuration/pyproject.toml`. Contains **tool config sections only** — no `[project]`, `[build-system]`, or uv workspace config. Projects inherit these settings automatically.

## ty Configuration Note

ty is pre-1.0. Keep `[tool.ty]` config **project-level** (in the project's `pyproject.toml`, not root) until ty stabilizes.

## Tool Execution

All tool invocations use `uv run` (not `uvx`) for reproducible versions pinned in `uv.lock`:

```bash
uv run ruff format .
uv run ruff check .
uv run pyright src/
uv run pytest
uv run ty check src/
uv run bandit -c pyproject.toml -r src/
uv run vulture src/ .vulture_whitelist.py --min-confidence 80
```

## Adding a New Python Project

1. Create `project.json` with `language:python` tag and all sub-targets declared as `{}`
2. Create `pyproject.toml` using the pattern above
3. Run `uv sync` to generate `uv.lock`
4. Add `ty` and `bandit` as dev dependencies: `uv add --dev ty 'bandit[toml]'`
5. Override composite targets (`format`, `lint`, `typecheck`, `test`) in `project.json`
6. Verify: `nx run <project>:lint-codebase`
