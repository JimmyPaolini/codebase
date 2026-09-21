import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsShapeService } from "./characteristics-shape.service";

describe(CharacteristicsShapeService, () => {
  let service: CharacteristicsShapeService;

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
    // Intentionally omit digits so the ?? "0" fallback is triggered
    const result = service.tallyUnitShapes({
      columns: 2,
      digits: [],
      levels: 2,
    } as any);

    expect(result.horizontalDashCount).toBe(0);
  });

  it("tallies all isolated shapes", () => {
    const tests = [
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
      const result = service.tallyUnitShapes({
        columns: 2,
        digits: t.code.split(""),
        levels: 2,
      } as any);
      expect((result as any)[t.field]).toBeGreaterThan(0);
    }
  });

  it("tallies embedded shapes", () => {
    const result = service.tallyUnitShapes({
      columns: 2,
      digits: ["6", "5", "a", "9"], // O shape
      levels: 2,
    } as any);
    expect(result.embeddedOCount).toBeGreaterThan(0);

    const result2 = service.tallyUnitShapes({
      columns: 2,
      digits: ["4", "4", "a", "9"], // U shape variants
      levels: 2,
    } as any);
    expect(result2.embeddedUCount).toBeGreaterThan(0);

    const result3 = service.tallyUnitShapes({
      columns: 2,
      digits: ["6", "5", "8", "8"], 
      levels: 2,
    } as any);
    expect(result3.embeddedUCount).toBeGreaterThan(0);

    const result4 = service.tallyUnitShapes({
      columns: 2,
      digits: ["6", "1", "a", "1"], 
      levels: 2,
    } as any);
    expect(result4.embeddedUCount).toBeGreaterThan(0);

    const result5 = service.tallyUnitShapes({
      columns: 2,
      digits: ["2", "5", "2", "9"], 
      levels: 2,
    } as any);
    expect(result5.embeddedUCount).toBeGreaterThan(0);
  });
});
