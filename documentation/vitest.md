# Vitest Configuration

This codebase uses a shared base Vitest configuration to maintain consistency across projects and ensure code quality standards.

## Overview

The base configuration is defined in [vitest.config.base.ts](/vitest.config.base.ts)
at the workspace root and provides standardized settings for all test suites.
All projects should extend this base configuration to inherit common settings
and maintain consistency.

## Base Configuration Details

The workspace-level `vitest.config.base.ts` provides:

- **Global test utilities**: `test`, `describe`, `it`, `expect`, and other
  globals are available without imports (no need to import from `vitest`)
- **Mock management**:
  - `clearMocks: true` - clears mock state between tests, preventing test
    pollution
  - `restoreMocks: true` - restores mock implementations to original between
    tests, ensuring clean test environment
- **Coverage provider**: Uses v8 (fast, built-in coverage provider)
- **Coverage reporters**: Generates multiple formats:
  - `text`: Terminal output during test run
  - `json-summary`: Machine-readable coverage summary
  - `lcov`: Standard format for coverage tools
  - `html`: Visual HTML report in `coverage/index.html`
- **Coverage thresholds**: All projects inherit 96% minimum thresholds for:
  - Lines
  - Functions
  - Branches
  - Statements
- **Sensible defaults**: `passWithNoTests` allows projects without test files to pass (useful for utility libraries)

## Extending the Base Config

When adding Vitest to a new project or updating an existing one, extend the base configuration in your project's `vitest.config.ts`:

```texttypescript
import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // Your project-specific settings
      include: ["src/**/*.test.ts"],
      coverage: {
        include: ["src/**/*.ts"],
        exclude: ["src/**/*.test.ts"],
      },
      // Add project-specific settings as needed:
      // setupFiles: ["./setup.ts"],
    },
  }),
);
```

## Current Project Configurations

### applications/caelundas

The main application with critical tests. Extends base config with:

- **Test pattern**: `src/**/*.test.ts`
- **Setup files**: `./testing/setup.ts` (initializes test environment with fixtures, stubs, etc.)
- **Coverage**: Includes all `src/**/*.ts` files, excludes test files
- **Inherits**: 96% coverage thresholds, mock clearing/restoration from base config

### tools/code-generator

Utility library for Nx generators. Extends base config with:

- **Test pattern**: `src/**/*.test.ts`
- **Coverage**: Includes all `src/**/*.ts` files, excludes test files
- **Inherits**: 96% coverage thresholds from base config
- **Note**: Uses `passWithNoTests: true` from base, so no tests are required

## Running Tests

```bash
# Test a specific project
nx run <project>:vitest

# Test all affected projects (based on git diff from main)
nx affected -t vitest

# Run tests with coverage reports
nx affected -t vitest --coverage

# Test all projects in the codebase
nx run-many -t vitest --all

# Test with parallelization (default: 3 projects at once)
nx run-many -t vitest --all --parallel=3
```

## Coverage Reports

After running tests with `--coverage`, each project generates reports in its `coverage/` directory:

```text
project-root/
└── coverage/
    ├── coverage-final.json      # Machine-readable results
    ├── lcov.info               # Standard LCOV format (used by CI)
    ├── lcov-report/index.html  # Visual HTML report
    └── ...
```

Open `coverage/index.html` in a browser to view detailed line-by-line coverage analysis.

## CI Integration

The CI workflow ([`.github/workflows/test-coverage.yml`](/.github/workflows/test-coverage.yml)) runs:

```bash
npx nx affected -t vitest --parallel=3 --coverage
```

This ensures:

- Only affected projects are tested (faster feedback)
- Coverage reports are generated for all tests
- All projects must meet 96% coverage thresholds to pass
- Coverage artifacts are uploaded for reporting

## Coverage Threshold Enforcement

All projects inherit 96% thresholds from the base config. Projects must meet these minimums:

```text
┌─────────────┬──────────┐
│ Metric      │ Minimum  │
├─────────────┼──────────┤
│ Lines       │ 96%      │
│ Functions   │ 96%      │
│ Branches    │ 96%      │
│ Statements  │ 96%      │
└─────────────┴──────────┘
```

If a project fails to meet thresholds, the test command will fail and display
detailed coverage information showing which files are below the threshold.

**To override thresholds** for a specific project (not recommended), you can
define custom thresholds in the project's `vitest.config.ts`:

```typescript
coverage: {
  thresholds: {
    lines: 96,    // Override global 96%
    functions: 85,
    branches: 75,
    statements: 90,
  },
}
```

## Testing Best Practices

### Test File Naming

Use descriptive suffixes to categorize tests:

- `*.unit.test.ts` - Pure function tests, no I/O
- `*.integration.test.ts` - Database/API interactions
- `*.e2e.test.ts` - Full application workflows
- `*.test.ts` - Generic tests (default pattern)

Projects can run specific test types using test names:

```bash
nx run caelundas:vitest --testNamePattern="unit"
```

### Setup Files

Use `setupFiles` to initialize test environment:

- Create test fixtures and factories
- Mock global objects or APIs
- Configure database/ORM for tests
- Set environment variables

### Mock Management

When `clearMocks: true` and `restoreMocks: true` are enabled:

- All mocks are cleared between tests (preventing test pollution)
- Mock implementations are restored to original
- Test isolation is automatically maintained

### Coverage Exclusions

Common patterns to exclude from coverage:

- Generated code
- Type definitions (`.d.ts`)
- Test files themselves (`**/*.test.ts`)
- Configuration files
- Entry points with minimal logic

## Adding Vitest to a New Project

### Minimal Setup

1. Create `vitest.config.ts` in project root
2. Add dependency (if not present in codebase root `package.json`):

   ```bash
   pnpm add -D vitest @vitest/coverage-v8
   ```

3. Create `src/__tests__/example.test.ts`:

   ```typescript
   describe("example", () => {
     it("works", () => {
       expect(1 + 1).toBe(2);
     });
   });
   ```

4. Update `project.json` to add test target

### Complete Example

**project.json**:

```json
{
  "targets": {
    "test": {
      "executor": "nx:run-commands",
      "options": {
        "command": "vitest run {args.args}",
        "cwd": "packages/my-package"
      }
    }
  }
}
```

**vitest.config.ts**:

```typescript
import { mergeConfig, defineConfig } from "vitest/config";
import baseConfig from "../../vitest.config.base";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ["src/**/*.test.ts"],
      coverage: {
        include: ["src/**/*.ts"],
        exclude: ["src/**/*.test.ts"],
      },
      // Add setup files if needed
      setupFiles: ["./testing/setup.ts"],
    },
  }),
);
```

## Debugging Tests

### Run Single Test File

```bash
nx run caelundas:vitest src/events/aspects/aspects.events.test.ts
```

### Run Tests Matching Pattern

```bash
nx run caelundas:vitest --testNamePattern="aspect"
```

### Run in Watch Mode

```bash
# For projects with watch target
nx run caelundas:vitest:watch

# Or manually
cd applications/caelundas && vitest
```

### Debug with Node Inspector

```bash
node --inspect-brk ./node_modules/vitest/vitest.mjs run
```

## Common Issues

### Coverage Thresholds Not Enforced

Ensure `reportOnFailure: true` is in coverage config:

```typescript
coverage: {
  reportOnFailure: true,  // Makes test fail if thresholds not met
}
```

### Test Files Not Found

Verify `include` pattern matches your file structure:

```typescript
test: {
  include: ["src/**/*.test.ts"],  // Must match your actual test files
}
```

## References

- [Vitest Documentation](https://vitest.dev)
- [Vitest Coverage Documentation](https://vitest.dev/guide/coverage)
- [Vitest Configuration Reference](https://vitest.dev/config/)
