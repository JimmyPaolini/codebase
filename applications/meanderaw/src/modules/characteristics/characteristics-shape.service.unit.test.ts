import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsShapeService } from "./characteristics-shape.service";

import type { ParsedCode } from "../code/code.types";
import type { UnitShapeCounts } from "./characteristics.types";

describe(CharacteristicsShapeService, () => {
  let service: CharacteristicsShapeService;

  const parsedCode = (overrides: Partial<ParsedCode> = {}): ParsedCode => ({
    columns: 2,
    digits: "",
    levels: 2,
    rows: 3,
    ...overrides,
  });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CharacteristicsShapeService],
    }).compile();

    service = await module.resolve(CharacteristicsShapeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("tallies missing digit string fallbacks", () => {
    // Intentionally empty digits so the ?? "0" fallback is triggered
    const result = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "",
        levels: 2,
      }),
    );

    expect(result.horizontalDashCount).toBe(0);
  });

  it("tallies all isolated shapes", () => {
    const tests: { code: string; field: keyof UnitShapeCounts }[] = [
      { code: "9a56", field: "plusCount" },
      { code: "0021", field: "horizontalDashCount" },
      { code: "2100", field: "horizontalDashCount" },
      { code: "40a1", field: "lCount" },
      { code: "0429", field: "lCount" },
      { code: "2508", field: "lCount" },
      { code: "6180", field: "lCount" },
      { code: "44a9", field: "uCount" },
      { code: "61a1", field: "uCount" },
      { code: "2529", field: "uCount" },
      { code: "6588", field: "uCount" },
      { code: "65a9", field: "oCount" },
      { code: "0408", field: "verticalDashCount" },
      { code: "4080", field: "verticalDashCount" },
      { code: "2121", field: "shapeICount" },
      { code: "4488", field: "shapeICount" },
    ];

    for (const t of tests) {
      // 2 columns, 2 levels -> length 4 string
      const result = service.tallyUnitShapes(
        parsedCode({
          columns: 2,
          digits: t.code,
          levels: 2,
        }),
      );

      expect(result[t.field]).toBeGreaterThan(0);
    }
  });

  it("tallies embedded shapes", () => {
    const result = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "65a9", // O shape
        levels: 2,
      }),
    );

    expect(result.embeddedOCount).toBeGreaterThan(0);

    const result2 = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "44a9", // U shape variants
        levels: 2,
      }),
    );

    expect(result2.embeddedUCount).toBeGreaterThan(0);

    const result3 = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "6588",
        levels: 2,
      }),
    );

    expect(result3.embeddedUCount).toBeGreaterThan(0);

    const result4 = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "61a1",
        levels: 2,
      }),
    );

    expect(result4.embeddedUCount).toBeGreaterThan(0);

    const result5 = service.tallyUnitShapes(
      parsedCode({
        columns: 2,
        digits: "2529",
        levels: 2,
      }),
    );

    expect(result5.embeddedUCount).toBeGreaterThan(0);
  });
});
