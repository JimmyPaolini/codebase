---
name: Vitest Coverage 96 Percent
description: Raise all Vitest coverage thresholds to 96 percent and expand tests until affected projects consistently meet the new floor.
created: 2026-06-18T23:04:17Z
updated: 2026-06-18T23:12:58Z
status: 'Planned'
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan raises the shared Vitest coverage floor to 96 percent, keeps all Vitest entry points aligned with that floor, and adds focused tests to close the remaining gaps without weakening existing rules. The latest coverage run showed the biggest gaps in `applications/caelundas` around `main.ts`, `minor-aspects-composer.service.ts`, `specialty-aspects-composer.service.ts`, `caelundas.command.ts`, `eclipse-calculation.service.ts`, and `eclipse-geometry.service.ts`; the full `caelundas` report still has 103 files below 96 percent, including many `*.module.ts`, `*.constants.ts`, and `*.types.ts` files that need direct import or wiring tests; `applications/lexico-ingestion` still needs its `logger.service.unit.test.ts` failure resolved before its coverage table can be trusted end-to-end; `tools/conformance` surfaced a template mismatch around `nestjs-service-file`.

## 1. Requirements & Constraints

- **REQ-001**: Raise the shared Vitest coverage thresholds in `configuration/vitest.config.ts` from 80 percent to 96 percent for lines, functions, branches, and statements.
- **REQ-002**: Keep every Vitest-based project aligned with the shared threshold so no project bypasses the 96 percent floor through local configuration.
- **REQ-003**: Expand tests only where they improve real behavioral coverage; do not add tests that merely increase line counts without asserting meaningful behavior.
- **REQ-004**: Keep the coverage workflow compatible with `npx nx affected --target=test --parallel=3 --configuration=coverage` in `.github/workflows/test-code.yml`.
- **REQ-005**: Update documentation that still describes the old 80 percent threshold so the written guidance matches enforcement.
- **CON-001**: `affirmations` is pytest-based and out of scope for Vitest threshold changes.
- **CON-002**: Existing Vitest project structure must remain intact; do not rewrite project scaffolding to chase coverage.
- **CON-003**: Changes must stay within the current monorepo conventions for strict TypeScript, Nx tasks, and project-local Vitest configs.
- **GUD-001**: Prefer small, deterministic unit tests for pure logic and focused integration tests for branching orchestration.
- **GUD-002**: Treat coverage gaps as signals for missing behavior checks, not as a reason to dilute the threshold.
- **PAT-001**: Use the shared Vitest config as the source of truth for default coverage thresholds.
- **PAT-002**: Keep project Vitest configs minimal and only override them when a project-specific setting is required.

## 2. Implementation Steps

### Implementation Phase 1 — Threshold Alignment

- GOAL-001: Update the shared Vitest coverage floor and synchronize all Vitest project entry points with the new 96 percent requirement.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-001 | Update `configuration/vitest.config.ts` coverage thresholds for `lines`, `functions`, `branches`, and `statements` from `80` to `96`. |  |  |
| TASK-002 | Verify `applications/caelundas/vitest.config.ts`, `applications/lexico-ingestion/vitest.config.ts`, and `tools/conformance/vitest.config.ts` continue to inherit or match the shared 96 percent floor without project-specific drift. |  |  |
| TASK-003 | Confirm `.github/workflows/test-code.yml` still invokes the Vitest coverage path used by CI and does not need command changes for the higher threshold. |  |  |

### Implementation Phase 2 — Coverage Expansion

- GOAL-002: Add or strengthen tests in the lowest-coverage Vitest projects until the new threshold is met.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-004 | Run Vitest coverage for `applications/caelundas` and prioritize the lowest-coverage files first: `src/main.ts`, `src/modules/caelundas/caelundas.command.ts`, `src/modules/minor-aspects/minor-aspects-composer.service.ts`, `src/modules/specialty-aspects/specialty-aspects-composer.service.ts`, `src/modules/eclipses/eclipse-calculation.service.ts`, `src/modules/eclipses/eclipse-geometry.service.ts`, `src/modules/aspects/aspects.service.ts`, `src/modules/twilights/twilights.service.ts`, and `src/modules/logger/logger.service.ts`. |  |  |
| TASK-005 | Add focused unit tests for uncovered pure logic in `applications/caelundas/src/main.ts`, `src/modules/caelundas/caelundas.command.ts`, and the aspect/composer services so each branch and edge case is asserted explicitly instead of depending on broad integration coverage. |  |  |
| TASK-006 | Expand `applications/caelundas` integration or end-to-end coverage for orchestration paths in `eclipses`, `calendar`, and `ephemeris-coordinate` modules, especially for error branches, timezone boundaries, and empty-result handling that unit tests miss. |  |  |
| TASK-007 | Run Vitest coverage for `tools/conformance`, then strengthen tests around the `nestjs-service-file` template and related generator validators so the logger service fixture and similar instances satisfy the conformance rules. |  |  |
| TASK-008 | Run Vitest coverage for `applications/lexico-ingestion`, fix `src/modules/logger/logger.service.unit.test.ts` so the scoped provider uses the correct NestJS resolution path, then add tests for the remaining parsing, normalization, and command/module orchestration hotspots revealed by the next coverage run. |  |  |

### Implementation Phase 3 — Documentation and Verification

- GOAL-003: Bring plan-adjacent docs and validation commands into sync with the new threshold and confirm the workspace passes at 96 percent.

| Task | Description | Completed | Date |
| ---- | ----------- | --------- | ---- |
| TASK-009 | Update `documentation/vitest.md` so every mention of the coverage floor reflects 96 percent instead of 80 percent. |  |  |
| TASK-010 | Re-run the affected Vitest coverage commands until the workspace-level coverage gate passes with the new threshold. |  |  |
| TASK-011 | Capture any remaining uncovered hotspots in the plan for follow-up if a file cannot reasonably reach 96 percent without design changes. |  |  |

## 3. Coverage Hotspot Matrix

### 3.1 `applications/caelundas` entry points and composition

- `src/main.ts`
- `src/modules/caelundas/caelundas.command.ts`
- `src/modules/minor-aspects/minor-aspects-composer.service.ts`
- `src/modules/specialty-aspects/specialty-aspects-composer.service.ts`

Strategy: add CLI smoke tests, early-return tests, and error-path assertions for command parsing and minute-loop orchestration.

### 3.2 `applications/caelundas` executable services

- `src/modules/eclipses/eclipse-calculation.service.ts`
- `src/modules/eclipses/eclipse-geometry.service.ts`
- `src/modules/aspects/aspects.service.ts`
- `src/modules/twilights/twilights.service.ts`
- `src/modules/ephemeris/ephemeris-coordinate.service.ts`
- `src/modules/annual-solar-cycle/annual-solar-cycle-events.service.ts`
- `src/modules/logger/logger.service.ts`
- `src/modules/calendar/calendar.service.ts`
- `src/modules/eclipses/eclipse-topocentric.service.ts`
- `src/modules/triple-aspects/triple-aspects-composer.service.ts`
- `src/modules/twilights/twilights-builder.service.ts`
- `src/modules/ephemeris/ephemeris-phenomena.service.ts`
- `src/modules/twilights/twilights-detector.service.ts`
- `src/modules/ephemeris/ephemeris.service.ts`
- `src/modules/specialty-aspects/specialty-aspects-progressive.service.ts`
- `src/modules/major-aspects/major-aspect-progressive.service.ts`
- `src/modules/minor-aspects/minor-aspects-progressive.service.ts`
- `src/modules/triple-aspects/triple-aspects.service.ts`
- `src/modules/monthly-lunar-cycle/monthly-lunar-cycle.service.ts`
- `src/modules/triple-aspects/triple-aspects-detector.service.ts`
- `src/modules/ingresses/ingresses-composer.service.ts`
- `src/modules/quintuple-aspects/quintuple-aspects.service.ts`
- `src/modules/phases/phase-calculation.service.ts`

Strategy: add table-driven unit tests for branches, null/empty inputs, timezone edges, and error handling paths that currently remain uncovered.

### 3.3 `applications/caelundas` structural files

- `src/modules/annual-solar-cycle/annual-solar-cycle.module.ts`
- `src/modules/aspects/aspects.module.ts`
- `src/modules/aspects/aspects.utilities.module.ts`
- `src/modules/caelundas/caelundas.module.ts`
- `src/modules/calendar/calendar.module.ts`
- `src/modules/daily-cycles/daily-cycles.module.ts`
- `src/modules/datetime/datetime.module.ts`
- `src/modules/eclipses/eclipses.module.ts`
- `src/modules/ephemeris/ephemeris.module.ts`
- `src/modules/ingresses/ingresses.module.ts`
- `src/modules/input/input.module.ts`
- `src/modules/logger/logger.module.ts`
- `src/modules/major-aspects/major-aspects.module.ts`
- `src/modules/math/math.module.ts`
- `src/modules/minor-aspects/minor-aspects.module.ts`
- `src/modules/monthly-lunar-cycle/monthly-lunar-cycle.module.ts`
- `src/modules/perfective/perfective.module.ts`
- `src/modules/phases/phases.module.ts`
- `src/modules/progressive/progressive.module.ts`
- `src/modules/progressive/progressive.utilities.module.ts`
- `src/modules/quadruple-aspects/quadruple-aspects.module.ts`
- `src/modules/quintuple-aspects/quintuple-aspects.module.ts`
- `src/modules/retrogrades/retrogrades.module.ts`
- `src/modules/sextuple-aspects/sextuple-aspects.module.ts`
- `src/modules/specialty-aspects/specialty-aspects.module.ts`
- `src/modules/stellium/stellium.module.ts`
- `src/modules/triple-aspects/triple-aspects.module.ts`
- `src/modules/twilights/twilights.module.ts`

Strategy: add Nest module instantiation tests or provider-registration smoke tests so each module file executes in a real testing container.

### 3.4 `applications/caelundas` constant and type files

- `src/modules/calendar/calendar.constants.ts`
- `src/modules/daily-cycles/daily-cycles.constants.ts`
- `src/modules/datetime/datetime.constants.ts`
- `src/modules/eclipses/eclipses.constants.ts`
- `src/modules/ingresses/ingresses.constants.ts`
- `src/modules/logger/logger.constants.ts`
- `src/modules/major-aspects/major-aspects.constants.ts`
- `src/modules/math/math.constants.ts`
- `src/modules/minor-aspects/minor-aspects.constants.ts`
- `src/modules/monthly-lunar-cycle/monthly-lunar-cycle.constants.ts`
- `src/modules/perfective/perfective.constants.ts`
- `src/modules/progressive/progressive.constants.ts`
- `src/modules/quadruple-aspects/quadruple-aspects.constants.ts`
- `src/modules/quintuple-aspects/quintuple-aspects.constants.ts`
- `src/modules/retrogrades/retrogrades.constants.ts`
- `src/modules/sextuple-aspects/sextuple-aspects.constants.ts`
- `src/modules/specialty-aspects/specialty-aspects.constants.ts`
- `src/modules/stellium/stellium.constants.ts`
- `src/modules/triple-aspects/triple-aspects.constants.ts`
- `src/modules/twilights/twilights.constants.ts`
- `src/modules/annual-solar-cycle/annual-solar-cycle.types.ts`
- `src/modules/aspects/aspects.types.ts`
- `src/modules/caelundas/caelundas.body-types.ts`
- `src/modules/calendar/calendar.types.ts`
- `src/modules/daily-cycles/daily-cycles.types.ts`
- `src/modules/datetime/datetime.types.ts`
- `src/modules/eclipses/eclipses.types.ts`
- `src/modules/ephemeris/ephemeris.internal.types.ts`
- `src/modules/ephemeris/ephemeris.types.ts`
- `src/modules/ingresses/ingresses.types.ts`
- `src/modules/input/input.types.ts`
- `src/modules/logger/logger.types.ts`
- `src/modules/major-aspects/major-aspects.types.ts`
- `src/modules/math/math.types.ts`
- `src/modules/minor-aspects/minor-aspects.types.ts`
- `src/modules/monthly-lunar-cycle/monthly-lunar-cycle.types.ts`
- `src/modules/perfective/perfective.types.ts`
- `src/modules/phases/phases.types.ts`
- `src/modules/progressive/progressive.types.ts`
- `src/modules/quadruple-aspects/quadruple-aspects.types.ts`
- `src/modules/quintuple-aspects/quintuple-aspects.types.ts`
- `src/modules/retrogrades/retrogrades.types.ts`
- `src/modules/sextuple-aspects/sextuple-aspects.types.ts`
- `src/modules/specialty-aspects/specialty-aspects.types.ts`
- `src/modules/stellium/stellium.types.ts`
- `src/modules/triple-aspects/triple-aspects.types.ts`
- `src/modules/twilights/twilights.types.ts`
- `src/modules/caelundas/caelundas.types.ts`

Strategy: add focused import-and-assertion tests for runtime constants and cover type-bearing source files indirectly through the executable modules that consume them.

### 3.5 Cross-project blockers

- `applications/lexico-ingestion/src/modules/logger/logger.service.unit.test.ts`
- `tools/conformance/src/conformance.test.ts`
- `tools/conformance/src/generators/nestjs-service-file/templates/__nameKebabCase__.service.unit.test.ts`

Strategy: fix the scoped-provider retrieval in `lexico-ingestion`, then rerun coverage so the remaining sub-96 files can be measured; update the conformance template or validator harness so the generated logger fixture matches the expected NestJS service-file pattern.

## 4. Alternatives

- **ALT-001**: Lower the threshold per project instead of raising shared coverage rules. Rejected because it weakens the quality bar and hides inconsistent test quality.
- **ALT-002**: Add broad snapshot tests to inflate coverage quickly. Rejected because they do not reliably improve behavioral confidence.
- **ALT-003**: Exempt low-coverage files from thresholds. Rejected because the goal is to improve coverage, not bypass it.

## 5. Dependencies

- **DEP-001**: Shared Vitest configuration in `configuration/vitest.config.ts`.
- **DEP-002**: Vitest project configs for `applications/caelundas`, `applications/lexico-ingestion`, and `tools/conformance`.
- **DEP-003**: Existing CI coverage workflow in `.github/workflows/test-code.yml`.
- **DEP-004**: Test data, fixtures, and helpers already present in each Vitest-enabled project.

## 6. Files

- **FILE-001**: `configuration/vitest.config.ts` — shared threshold source.
- **FILE-002**: `applications/caelundas/vitest.config.ts` — project Vitest config to verify alignment.
- **FILE-003**: `applications/lexico-ingestion/vitest.config.ts` — project Vitest config to verify alignment.
- **FILE-004**: `tools/conformance/vitest.config.ts` — project Vitest config to verify alignment.
- **FILE-005**: `.github/workflows/test-code.yml` — CI coverage entry point.
- **FILE-006**: `documentation/vitest.md` — coverage threshold documentation that must be updated.
- **FILE-007**: `applications/caelundas/src/**/*.test.ts` — primary test expansion surface.
- **FILE-008**: `applications/lexico-ingestion/src/**/*.test.ts` — secondary test expansion surface.
- **FILE-009**: `tools/conformance/src/**/*.test.ts` and `tools/conformance/src/**/testing/**/*.test.ts` — utility and generator test surface.
- **FILE-010**: `applications/caelundas/src/modules/eclipses/eclipse-calculation.service.ts`, `applications/caelundas/src/modules/eclipses/eclipse-geometry.service.ts`, `applications/caelundas/src/modules/aspects/aspects.service.ts`, `applications/caelundas/src/modules/twilights/twilights.service.ts`, `applications/caelundas/src/modules/logger/logger.service.ts` — the first high-impact source files to strengthen for the 96 percent target.
- **FILE-011**: `applications/caelundas/src/main.ts`, `applications/caelundas/src/modules/caelundas/caelundas.command.ts`, `applications/caelundas/src/modules/minor-aspects/minor-aspects-composer.service.ts`, `applications/caelundas/src/modules/specialty-aspects/specialty-aspects-composer.service.ts` — the lowest-coverage execution and composition paths.
- **FILE-012**: `applications/lexico-ingestion/src/modules/logger/logger.service.unit.test.ts` — the blocked test that must be fixed before the project coverage run can expose its remaining hotspots.
- **FILE-013**: `tools/conformance/src/generators/nestjs-service-file/templates/__nameKebabCase__.service.unit.test.ts` — the template implicated by the conformance failure.

## 7. Testing

- **TEST-001**: Run `pnpm exec nx run caelundas:test:coverage` or the equivalent Nx coverage target used in the workspace and confirm it passes at 96 percent.
- **TEST-002**: Run `pnpm exec nx run lexico-ingestion:test:coverage` and confirm the project passes at 96 percent.
- **TEST-003**: Run `pnpm exec nx run conformance:vitest -- --coverage` or the workspace’s supported coverage entry point for conformance and confirm it passes at 96 percent.
- **TEST-004**: Run `pnpm exec nx affected --target=test --parallel=3 --configuration=coverage` to validate the CI-shaped path.
- **TEST-005**: Re-run the affected project tests after each test batch to verify the added assertions increase coverage without introducing regressions.

## 8. Risks & Assumptions

- **RISK-001**: Some uncovered lines may be inside generated templates or glue code that cannot reasonably reach 96 percent without structural refactors.
- **RISK-002**: Coverage may surface brittle or overly broad modules that need small refactors before meaningful tests can be written.
- **RISK-003**: Conformance generator templates may require targeted test harness updates if their current tests do not exercise the right files.
- **ASSUMPTION-001**: The existing Vitest project split is the correct boundary for coverage work and does not need restructuring.
- **ASSUMPTION-002**: The current CI workflow already exercises the right coverage commands; only the threshold value and tests need attention.

## 9. Related Specifications / Further Reading

- `configuration/vitest.config.ts`
- `.github/workflows/test-code.yml`
- `documentation/vitest.md`
- Vitest coverage documentation: https://vitest.dev/guide/coverage
- Nx affected task documentation: https://nx.dev
