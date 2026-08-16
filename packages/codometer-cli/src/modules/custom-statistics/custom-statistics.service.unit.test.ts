import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CustomStatisticsService } from "./custom-statistics.service";

const trackedFiles = [
  "packages/lexico-components/src/button.component.tsx",
  "tools/synchronization/src/modules/logger/logger.module.ts",
  "tools/synchronization/src/modules/logger/logger.service.ts",
  "tools/synchronization/src/modules/logger/logger.service.unit.test.ts",
  "applications/lexico/src/routes/index.tsx",
  "applications/lexico/src/modules/entry/entry.service.ts",
  "applications/lexico/src/modules/entry/entry.service.integration.test.ts",
];

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
        { color: "7c3aed", label: "Services", patterns: ["**/*.service.ts"] },
        { color: "0284c7", label: "Modules", patterns: ["**/*.module.ts"] },
      ],
      trackedFiles,
    });

    expect(result).toStrictEqual([
      { color: "7c3aed", files: 2, label: "Services" },
      { color: "0284c7", files: 1, label: "Modules" },
    ]);
  });

  it("keeps a suffixed test file out of the counter it extends", () => {
    const result = service.analyze({
      statistics: [
        { color: "7c3aed", label: "Services", patterns: ["**/*.service.ts"] },
      ],
      trackedFiles,
    });

    // `logger.service.unit.test.ts` is a test, not a service, and the glob
    // says so by requiring the name to end there.
    expect(result[0]?.files).toBe(2);
  });

  it("counts a file matching several of one counter's globs once", () => {
    const result = service.analyze({
      statistics: [
        {
          color: "16a34a",
          label: "Tests",
          patterns: ["**/*.test.ts", "**/*.unit.test.ts"],
        },
      ],
      trackedFiles,
    });

    expect(result[0]?.files).toBe(2);
  });

  it("reports zero for a counter that matches nothing", () => {
    const result = service.analyze({
      statistics: [
        { color: "dc2626", label: "Resolvers", patterns: ["**/*.resolver.ts"] },
      ],
      trackedFiles,
    });

    expect(result[0]?.files).toBe(0);
  });

  it("returns nothing when no counters are configured", () => {
    expect(service.analyze({ statistics: [], trackedFiles })).toStrictEqual([]);
  });
});
