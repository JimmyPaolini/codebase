import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CustomStatisticsService } from "./custom-statistics.service";

import type { ResolvedCodometerCustomStatistic } from "@codometer/configuration";

const trackedFiles = [
  "packages/lexico-components/src/button.component.tsx",
  "tools/synchronization/src/modules/logger/logger.module.ts",
  "tools/synchronization/src/modules/logger/logger.service.ts",
  "tools/synchronization/src/modules/logger/logger.service.unit.test.ts",
  "applications/lexico/src/routes/index.tsx",
  "applications/lexico/src/modules/entry/entry.service.ts",
  "applications/lexico/src/modules/entry/entry.service.integration.test.ts",
];

/** Builds a counter with the fields a configuration would have filled in. */
function buildStatistic(
  overrides: Partial<ResolvedCodometerCustomStatistic>,
): ResolvedCodometerCustomStatistic {
  return {
    color: "7c3aed",
    group: "conventions",
    label: "Counter",
    patterns: [],
    ...overrides,
  };
}

describe(CustomStatisticsService, () => {
  let service: CustomStatisticsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CustomStatisticsService],
    }).compile();

    service = await module.resolve(CustomStatisticsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("counts the files each configured glob claims", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
        buildStatistic({
          color: "0284c7",
          label: "Modules",
          patterns: ["**/*.module.ts"],
        }),
      ],
      symbolCounts: {},
      trackedFiles,
    });

    expect(result).toStrictEqual([
      { color: "7c3aed", count: 2, group: "conventions", label: "Services" },
      { color: "0284c7", count: 1, group: "conventions", label: "Modules" },
    ]);
  });

  it("keeps a suffixed test file out of the counter it extends", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
      ],
      symbolCounts: {},
      trackedFiles,
    });

    // `logger.service.unit.test.ts` is a test, not a service, and the glob
    // says so by requiring the name to end there.
    expect(result[0]?.count).toBe(2);
  });

  it("counts a file matching several of one counter's globs once", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({
          label: "Tests",
          patterns: ["**/*.test.ts", "**/*.unit.test.ts"],
        }),
      ],
      symbolCounts: {},
      trackedFiles,
    });

    expect(result[0]?.count).toBe(2);
  });

  it("reports zero for a counter that matches nothing", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({ label: "Resolvers", patterns: ["**/*.resolver.ts"] }),
      ],
      symbolCounts: {},
      trackedFiles,
    });

    expect(result[0]?.count).toBe(0);
  });

  it("returns nothing when no counters are configured", () => {
    expect(
      service.analyze({ statistics: [], symbolCounts: {}, trackedFiles }),
    ).toStrictEqual([]);
  });

  it("labels a symbol counter with what the analyzer tallied", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({
          group: "typescript",
          label: "Static Methods",
          symbols: { kinds: ["method"], modifiers: ["static"] },
        }),
      ],
      symbolCounts: { "Static Methods": 12 },
      trackedFiles,
    });

    expect(result).toStrictEqual([
      {
        color: "7c3aed",
        count: 12,
        group: "typescript",
        label: "Static Methods",
      },
    ]);
  });

  // A symbol counter carries patterns to narrow which files are searched, so
  // it must not fall through to counting the files those patterns matched.
  it("never counts files for a counter that matches symbols", () => {
    const result = service.analyze({
      statistics: [
        buildStatistic({
          label: "Service Methods",
          patterns: ["**/*.service.ts"],
          symbols: { kinds: ["method"] },
        }),
      ],
      symbolCounts: {},
      trackedFiles,
    });

    expect(result[0]?.count).toBe(0);
  });

  it("hands the analyzer only the counters that match symbols", () => {
    const counters = service.buildSymbolCounters([
      buildStatistic({ label: "Services", patterns: ["**/*.service.ts"] }),
      buildStatistic({
        label: "Static Methods",
        patterns: ["packages/**"],
        symbols: { kinds: ["method"], modifiers: ["static"] },
      }),
      buildStatistic({
        label: "Classes",
        symbols: { kinds: ["class"] },
      }),
    ]);

    expect(counters).toStrictEqual([
      {
        kinds: ["method"],
        label: "Static Methods",
        modifiers: ["static"],
        patterns: ["packages/**"],
      },
      // A matcher naming no modifiers asks for the kind alone.
      { kinds: ["class"], label: "Classes", modifiers: [], patterns: [] },
    ]);
  });
});
