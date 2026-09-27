import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  BOOLEAN_CHARACTERISTIC_KEYS,
  NUMERIC_CHARACTERISTIC_KEYS,
} from "../characteristics/characteristics.constants";
import { CharacteristicsModule } from "../characteristics/characteristics.module";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ClassificationModule } from "../classification/classification.module";
import { CodeModule } from "../code/code.module";
import { CodeService } from "../code/code.service";
import { DrawingModule } from "../drawing/drawing.module";

import { DrawRecordService } from "./draw-record.service";

// 🧪 Tests

/**
 * Drives the record builder through the real pipeline rather than through
 * mocks of it, because a row is the whole of what this produces and a
 * mocked collaborator would only assert that this service forwards calls.
 */
describe(DrawRecordService, () => {
  let service: DrawRecordService;
  let codeService: CodeService;
  let characteristicsService: CharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        CharacteristicsModule,
        ClassificationModule,
        CodeModule,
        DrawingModule,
      ],
      providers: [DrawRecordService],
    }).compile();

    service = await module.resolve(DrawRecordService);
    codeService = module.get(CodeService);
    characteristicsService = module.get(CharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("record", () => {
    it("derives every field of a row from the Code alone, the family and sub-family among them", () => {
      const record = service.record(
        "4488",
        { columns: 2, rows: 2 },
        "enumerated",
      );

      expect(record).toMatchObject({
        bettiNumber0Count: 1,
        bettiNumber1Count: 0,
        characteristics: [
          "endsAreLatticeNeighbors",
          "endsOnBorderRules",
          "isBars",
          "isSingleArc",
          "isReducible",
        ],
        code: "02x02y4488",
        columns: 2,
        crossCount: 0,
        density: 1,
        edgeCount: 1,
        family: "bars",
        forkCount: 0,
        freeEndCount: 2,
        inkPointCount: 2,
        lattice: "4488",
        longestHorizontalRunLength: 0,
        longestVerticalRunLength: 1,
        provenance: "enumerated",
        repeats: 1,
        rows: 2,
        tileCrossingComponentDeltaCount: 0,
        tileCrossingCount: 0,
      });
      expect(record.drawingHash).toMatch(/^8fba/u);
      expect(record).not.toHaveProperty("pitch");
    });

    it("stores every numeric characteristic of the computed record under its own key, and the true booleans in key-list order", () => {
      const code = "2335635cc29ca339";
      const record = service.record(code, { columns: 4, rows: 4 }, "hardcoded");
      const canonical = codeService.parse(record.code);
      const expected = characteristicsService.compute(canonical);

      expect(
        NUMERIC_CHARACTERISTIC_KEYS.map((key) => [key, record[key]]),
      ).toStrictEqual(
        NUMERIC_CHARACTERISTIC_KEYS.map((key) => [key, expected[key]]),
      );

      expect(record.characteristics).toStrictEqual([
        ...BOOLEAN_CHARACTERISTIC_KEYS.filter((key) => expected[key]),
        ...(characteristicsService.isReducible(canonical)
          ? ["isReducible"]
          : []),
      ]);
    });

    it("records family and specific characteristics where a Code's structure earns them", () => {
      const record = service.record(
        "2335635cc29ca339",
        { columns: 4, rows: 4 },
        "hardcoded",
      );

      expect(record.family).toBe("whirl");
      expect(record).toMatchObject({ crossCount: 0, forkCount: 0 });

      const waterfallRecord = service.record(
        "255aa1",
        { columns: 2, rows: 3 },
        "hardcoded",
      );

      expect(waterfallRecord.family).toBe("waterfalls");
      expect(waterfallRecord.characteristics).toContain("isWaterfalls");

      const wideWaterfallRecord = service.record(
        "23531a",
        { columns: 3, rows: 2 },
        "hardcoded",
      );

      expect(wideWaterfallRecord.family).toBe("waterfalls");
      expect(wideWaterfallRecord.characteristics).toContain("isWaterfalls");
    });

    it("records the provenance it was given rather than deriving one, since where a Code came from is no property of the Code", () => {
      expect(
        service.record("00", { columns: 1, rows: 2 }, "hardcoded").provenance,
      ).toBe("hardcoded");
    });

    it("refuses a Code whose length disagrees with the shape it was named at", () => {
      expect(() =>
        service.record("00", { columns: 2, rows: 2 }, "enumerated"),
      ).toThrow(/need 4/u);
    });
  });
});
