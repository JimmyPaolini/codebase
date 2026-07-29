---
name: testing-strategy
description: "Use monorepo testing conventions: unit, integration, end-to-end test naming and Nx commands. Use when adding tests or recommending test coverage."
license: MIT
---

# Testing Strategy

This skill describes the monorepo testing model and naming conventions.

## When to Use This Skill

Use when asked to:

- Add tests or choose test types
- Name test files correctly
- Run tests via Nx
- Recommend coverage or test scope

## Test Types and Naming

- Unit: `*.unit.test.ts`
- Integration: `*.integration.test.ts`
- End-to-end: `*.end-to-end.test.ts`

## Run Tests

```bash
nx run <project>:test:unit
nx run <project>:test:integration
nx run <project>:test:end-to-end
nx affected --target=test --base=main
```

## Coverage Verification

When a task includes coverage goals (or CI enforces coverage thresholds), run:

```bash
nx run <project>:test --configuration=coverage
```

Key practice: after structural test refactors (renaming, regrouping, helper extraction), always re-run coverage to verify no threshold regression.

If branch coverage is just below threshold, add focused tests for uncovered guard/fallback branches first (for example undefined/null guards, sparse-array fallbacks, and error-only paths).

Additional coverage practices from recent 96% threshold work:

- Keep project Vitest configs thin and inherit shared defaults using `mergeConfig(...)` from `configuration/vitest.config.ts` so threshold changes stay centralized.
- Use a hotspot-first loop: generate coverage, sort the lowest branch-coverage files, patch the highest-impact offenders, then re-run coverage.
- Raise coverage with behavior-first assertions, not synthetic test inflation. Prioritize guard clauses, empty-result paths, fallback branches, and explicit error paths.
- Add dedicated branch-focused test files for services with dense branching logic so intent stays explicit and regressions are easier to detect after refactors.
- Prefer deterministic fixtures and fixed clocks for time-sensitive or orbital/math-heavy logic to keep branch tests stable.
- For orchestration services, combine focused unit tests with a small set of integration tests that verify cross-service error propagation and empty-data behavior.
- Include module wiring and constants/types-adjacent smoke tests where needed so structural files do not remain persistent blind spots under strict thresholds.
- Before opening or updating a coverage-focused PR, run the CI-shaped command locally: `nx affected --target=test --configuration=coverage --base=main`.

## Mocking with `createMock`

Use `@golevelup/ts-vitest`'s `createMock<T>()` to auto-mock any TypeScript class or interface. It returns a fully-typed `DeepMocked<T>` where every method is a `vi.fn()` and every property is recursively mocked via `Proxy`. Never write manual stub objects — `createMock` eliminates the maintenance burden and stays in sync with the source type automatically.

```ts
import { createMock } from "@golevelup/ts-vitest";
import type { DeepMocked } from "@golevelup/ts-vitest";
```

### Mocking TypeORM repositories in NestJS unit tests

Provide mocked repositories through Nest's DI system using `getRepositoryToken(Entity)` as the provider token. Never put repository mocks inside `imports:[]` — they belong in `providers:[]`.

```ts
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { DeepMocked } from "@golevelup/ts-vitest";
import type { Repository } from "typeorm";

const module = await Test.createTestingModule({
  imports: [LoggerModule],
  providers: [
    MyService,
    {
      provide: getRepositoryToken(MyEntity),
      useValue: createMock<Repository<MyEntity>>() satisfies DeepMocked<Repository<MyEntity>>,
    },
  ],
}).compile();
```

The `satisfies DeepMocked<Repository<T>>` annotation gives ESLint's type-aware rules a concrete type, preventing `unsafe-call` / `unsafe-assignment` false positives.

**Required `tsconfig.json` `paths` entry** for each NestJS project (ESLint's project service needs this to resolve the package's `.d.ts`):

```json
"paths": {
  "@golevelup/ts-vitest": [
    "./node_modules/@golevelup/ts-vitest/lib/index.d.ts"
  ]
}
```

### Mocking other services and dependencies

The same pattern applies to any injected class — services, clients, loggers, etc.:

```ts
{
  provide: MyOtherService,
  useValue: createMock<MyOtherService>(),
},
```

To configure mock return values in specific tests:

```ts
let service: MyService;
let repository: DeepMocked<Repository<MyEntity>>;

beforeAll(async () => {
  const module = await Test.createTestingModule({ ... }).compile();
  service = module.get(MyService);
  repository = module.get(getRepositoryToken(MyEntity));
});

it("finds an entity", async () => {
  repository.findOneBy.mockResolvedValue(myFixture);
  const result = await service.findOne(1);
  expect(result).toStrictEqual(myFixture);
});
```

## Cheerio Testing

Use Cheerio helpers when tests parse HTML/XML (especially parser/service tests) and repeated `cheerio.load(...)` setup appears.

- **When**: Unit tests that need deterministic DOM setup, selector-based parsing, root-node parsing, and branch coverage for missing-node guards.
- **How**: Prefer shared helpers over inline setup and avoid module-level Cheerio mocks for routine parsing tests.
- **Where (lexico-ingestion)**: import helpers from `applications/lexico-ingestion/testing/mocks.ts` and keep fixtures minimal and behavior-focused.

See the full guide with examples, do/don't guidance, and coverage tips: [Cheerio Testing Reference](./references/cheerio-testing.md).

## References

- [Testing Strategy](../../code-quality/testing-strategy.md)
- [Vitest](../../vitest.md)
- [Cheerio Testing Reference](./references/cheerio-testing.md)
