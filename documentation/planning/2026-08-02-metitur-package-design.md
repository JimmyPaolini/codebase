# `metitur` Package Design

**Date:** 2026-08-02
**Issue:** [#152 — Package `metitur`](https://github.com/JimmyPaolini/codebase/issues/152)
**Branch:** `nestjs-command-app-refactor-metitur`

## Summary

Formalize the ad-hoc `scripts/measure-code.ts` and `scripts/measure-code.py` scripts
into a proper NestJS command application at `packages/metitur`. The package must be
generic enough to run against any codebase, and must separate measurement logic from
README output logic.

---

## Architecture

The application is scaffolded with `conformance:nestjs-command-application`
(`type=packages`, `name=metitur`) and then populated with five domain modules plus
the standard `logger` module from the generator template.

```
packages/metitur/
  src/
    main.ts
    main.module.ts
    constants.ts
    modules/
      logger/                     # scaffolded by generator
      file-discovery/             # git ls-files → categorized file lists
      typescript-analysis/        # TypeScript/JS AST metrics
      python-analysis/            # Python AST metrics (via bundled analyze.py)
      statistics/                 # aggregates the above into CodeStatistics
      readme-badges/              # renders + writes/checks README badge block
      measure/                    # CLI command — wires statistics + readme-badges
```

---

## Modules

### `file-discovery`

Runs `git ls-files` (or falls back to a recursive file walk when not inside a git
repo), filters out excluded paths, and classifies each file by extension into:

- `sourceFiles` — all `.ts`, `.tsx`, `.cts`, `.mts`, `.js`, `.jsx`, `.cjs`, `.mjs`
- `tsFiles` — TypeScript subset
- `jsFiles` — JavaScript subset
- `testFiles` — any file matching `*.test.*` or `*.spec.*`
- `pyFiles` — all `.py` files
- `trackedFiles` — every file that passed the exclusion filter

Default excluded patterns (overridable):
`node_modules/`, `dist/`, `.nx/`, `build/`, `coverage/`, `notepads/`, `/templates/`

**Output type:** `FileDiscoveryResult` — typed object with all the above lists.

**Service method signature:**

```ts
discoverFiles(workingDirectory: string): FileDiscoveryResult
```

---

### `typescript-analysis`

Uses the TypeScript compiler API (`typescript` package, not `ts-morph`) to walk each
file's AST. Files are processed one at a time so memory stays O(1).

**Metrics collected:**

| Metric | Description |
|--------|-------------|
| `lines` | Total line count across all TS/JS files |
| `files` | Count of TS files + JS files |
| `testFiles` | Count of test files |
| `classes` | Class declarations and expressions |
| `functions` | Top-level function declarations, expressions, arrow functions |
| `methods` | Methods and accessors inside classes |
| `asyncFunctions` | Any function/method with the `async` modifier |
| `syncFunctions` | Any function/method without `async` |
| `interfaces` | Interface declarations |
| `enums` | Enum declarations |
| `constants` | `const` variable statements |
| `imports` | Import declarations |
| `externalPackages` | Set of referenced external npm package names |
| `decorators` | Decorator nodes |
| `exported` | Count of symbols with an `export` modifier |
| `genericDeclarations` | Declarations with at least one type parameter |
| `todos` | Lines containing `TODO` or `FIXME` in comments |

**Output type:** `TypescriptAnalysisResult`

**Service method signature:**

```ts
analyze(files: Pick<FileDiscoveryResult, 'sourceFiles'>): TypescriptAnalysisResult
```

---

### `python-analysis`

Invokes `uv run python packages/metitur/src/modules/python-analysis/analyze.py`
(or the equivalent relative path resolved from `workingDirectory`) and parses its
JSON output. The Python script is the same logic currently in `scripts/measure-code.py`,
moved into the module folder.

Gracefully returns a zeroed result when:
- No `.py` files exist
- `uv` is not installed

**Metrics collected:** `files`, `classes`, `functions`, `constants`, `protocols`,
`imports`, `decorators`, `lines`

**Output type:** `PythonAnalysisResult`

**Service method signature:**

```ts
async analyze(workingDirectory: string): Promise<PythonAnalysisResult>
```

---

### `statistics`

Aggregates `TypescriptAnalysisResult` + `PythonAnalysisResult` + raw `trackedFiles`
into a single `CodeStatistics` object. Also computes:

- `repoSizeMiB` — sum of `fs.statSync(file).size` across `trackedFiles`, divided by `1024²`
- `folders` — unique folder paths derived from `trackedFiles`

**Output type:** `CodeStatistics` — a flat object combining all per-language stats with
combined totals (e.g. `totalLines`, `totalFiles`, `totalFunctions`).

**Service method signature:**

```ts
compute(options: {
  trackedFiles: string[];
  typescript: TypescriptAnalysisResult;
  python: PythonAnalysisResult;
}): CodeStatistics
```

This module has no dependency on `file-discovery`, `typescript-analysis`, or
`python-analysis` — it only consumes their output types, keeping it independently
testable with plain objects.

---

### `readme-badges`

Accepts a `CodeStatistics` value and a target README file path. Knows nothing about
ASTs, file systems, or git.

**Responsibilities:**

1. **Render** — converts `CodeStatistics` into the
   `<!-- CODE_STATISTICS_START --> ... <!-- CODE_STATISTICS_END -->` shields.io badge
   block string
2. **Write** — replaces the existing block in the README file
3. **Check** — compares the rendered block to the one in the file; exits with a
   descriptive error (including a `diff`) if stale

Badge list is identical to the current script (Lines of Code, Repo Size, Folders,
Source Files, Test Files, External Packages, Classes, Functions, Sync Functions,
Async Functions, Interfaces, Generic Declarations, Enums, Constants, Imports,
Decorators, Exported Symbols, TODO Comments).

**Service method signatures:**

```ts
render(statistics: CodeStatistics): string
write(readmePath: string, statistics: CodeStatistics): void
check(readmePath: string, statistics: CodeStatistics): void  // throws on mismatch
```

---

### `measure` (command module)

The CLI entry point. Uses `nest-commander` `@Command` decorator.

**Command name:** `measure`

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--check` | `false` | Compare-only mode; exit 1 if README is stale |
| `--working-directory <path>` | `process.cwd()` | Target codebase root |
| `--readme-path <path>` | `README.md` | README file path (relative to working directory) |

**Run flow:**

1. Resolve `workingDirectory` and `readmePath`
2. Call `FileDiscoveryService.discoverFiles(workingDirectory)`
3. Call `TypescriptAnalysisService.analyze(files)`
4. Call `PythonAnalysisService.analyze(workingDirectory)`
5. Call `StatisticsService.compute({ trackedFiles, typescript, python })`
6. Call `ReadmeBadgesService.write(readmePath, statistics)` or `.check(...)` depending on `--check`

---

## Migration

After `metitur` is complete:

1. Update the `measure-code` target in the root `project.json`:
   - `write`: `pnpm exec nx run metitur:start -- measure --working-directory={workspaceRoot}`
   - `check`: `pnpm exec nx run metitur:start -- measure --check --working-directory={workspaceRoot}`
2. Delete `scripts/measure-code.ts` and `scripts/measure-code.py`
3. CI call `nx run codebase:measure-code:check` continues to work unchanged

---

## Testing

- **Unit tests** for each service (`*.service.unit.test.ts`) using mocked dependencies
- **`measure` command unit test** using mocked service calls
- No integration or end-to-end tests required for this package (all I/O is already
  covered at the service unit level with mocks)

---

## Out of Scope

- Supporting non-git codebases (fallback walk is a stretch goal, excluded for now)
- Badge color customization
- Output formats other than shields.io badge markdown
- Any language other than TypeScript/JavaScript and Python
