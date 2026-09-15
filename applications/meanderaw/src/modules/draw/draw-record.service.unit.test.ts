import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ConnectivityService } from "../characteristics/connectivity.service";
import { ClassificationService } from "../classification/classification.service";
import { SubFamilyService } from "../classification/sub-family.service";
import { CodeService } from "../code/code.service";
import { DrawingService } from "../drawing/drawing.service";
import { GeometryService } from "../geometry/geometry.service";
import { GraphService } from "../graph/graph.service";
import { SvgService } from "../svg/svg.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { DrawRecordService } from "./draw-record.service";

// 🧪 Tests

/**
 * Drives the record builder through the real pipeline rather than through
 * mocks of it, because a row is the whole of what this produces and a
 * mocked collaborator would only assert that this service forwards calls.
 */
describe(DrawRecordService, () => {
  let service: DrawRecordService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DrawRecordService,
        GeometryService,
        CharacteristicsService,
        ClassificationService,
        ConnectivityService,
        CodeService,
        SymmetryService,
        DrawingService,
        GraphService,
        SubFamilyService,
        TileService,
        SvgService,
      ],
    }).compile();

    service = await module.resolve(DrawRecordService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("record", () => {
    it("derives every field of a row from the Code alone, the family and sub-family among them", () => {
      const record = service.record(
        "4488",
        { columns: 2, rows: 3 },
        "enumerated",
      );

      expect({ ...record, svg: record.svg.slice(0, 4) }).toStrictEqual({
        code: "4488",
        columns: 2,
        components: 2,
        cycles: 0,
        family: "parallel",
        freeEnds: 4,
        hasBranching: false,
        hasCrossing: false,
        inkTJunctions: 0,
        inkXJunctions: 0,
        negativeTJunctions: 0,
        negativeXJunctions: 0,
        pitch: 2,
        provenance: "enumerated",
        rows: 3,
        subFamily: "bars",
        svg: "<svg",
      });
    });

    it("records a null family and a null sub-family where a Code's structure earns neither", () => {
      const record = service.record(
        "2569a1",
        { columns: 2, rows: 4 },
        "hardcoded",
      );

      expect(record).toMatchObject({ family: null, subFamily: null });
    });

    it("records the provenance it was given rather than deriving one, since where a Code came from is no property of the Code", () => {
      expect(
        service.record("00", { columns: 1, rows: 3 }, "hardcoded").provenance,
      ).toBe("hardcoded");
    });

    it("refuses a Code whose length disagrees with the shape it was named at", () => {
      expect(() =>
        service.record("00", { columns: 2, rows: 3 }, "enumerated"),
      ).toThrow(/need 4/u);
    });
  });
});
