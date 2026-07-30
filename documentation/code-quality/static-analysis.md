# Static Analysis & Code Quality

All projects use strict TypeScript with comprehensive automated quality checks:

| Tool | Purpose |
| --- | --- |
| **ESLint + Oxlint** | Linting with strict rules |
| **Oxfmt + Prettier** | Code formatting (Oxfmt primary, Prettier supplementary) |
| **TypeScript** | Strict type checking (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) |
| **Knip** | Unused files, exports, and dependency detection |
| **cspell** | Spell checking |
| **markdownlint** | Markdown linting |
| **Vitest** | Unit and integration testing |

## Running Checks

```bash
# Run all quality checks
nx run-many --target=analyze-code --all

# Check for unused code (review before using :write)
nx run codebase:knip
nx run codebase:knip:write  # auto-removes unused code — use with caution

# Run affected projects only
nx affected --target=analyze-code
```

Quality checks run automatically on staged files (pre-commit via lint-staged) and on all PRs via GitHub Actions.
