// cspell:ignore Neighbours

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsPathService } from "../characteristics/characteristics-path.service";
import { CharacteristicsShapeService } from "../characteristics/characteristics-shape.service";
import { CharacteristicsService } from "../characteristics/characteristics.service";
import { ConnectivityService } from "../characteristics/connectivity.service";
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
        CharacteristicsPathService,
        CharacteristicsShapeService,
        ConnectivityService,
        CodeService,
        SymmetryService,
        DrawingService,
        GraphService,
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

      expect({ ...record, drawingHash: record.drawingHash.slice(0, 4) })
        .toMatchInlineSnapshot(`
        {
          "characteristics": [
            "isJunctionFree",
            "endsAreLatticeNeighbours",
            "endsOnBorderRules",
            "isConnected",
            "isReducible",
            "isSingleArc",
          ],
          "code": "4488",
          "columns": 2,
          "componentCount": 1,
          "components": 1,
          "cornerCount": 0,
          "cycleCount": 0,
          "cycles": 0,
          "density": 1,
          "dotCount": 0,
          "drawingHash": "8fba",
          "edgeCount": 1,
          "embeddedOCount": 0,
          "embeddedUCount": 0,
          "families": [],
          "freeEnds": 2,
          "horizontalDashCount": 0,
          "horizontalPointCount": 0,
          "inkPointCount": 2,
          "inkTJunctions": 0,
          "inkXJunctions": 0,
          "lCount": 0,
          "longestHorizontalRun": 0,
          "longestVerticalRun": 1,
          "negativeTJunctions": 0,
          "negativeXJunctions": 0,
          "oCount": 0,
          "pitch": 1,
          "plusCount": 0,
          "provenance": "enumerated",
          "rows": 3,
          "seamComponents": 0,
          "seamCycles": 0,
          "seamTJunctions": 0,
          "seamXJunctions": 0,
          "shapeICount": 1,
          "tCount": 0,
          "uCount": 0,
          "verticalDashCount": 0,
          "verticalPointCount": 0,
          "xCount": 0,
        }
      `);
    });

    it("records empty families and specific characteristics where a Code's structure earns them", () => {
      const record = service.record(
        "2569a1",
        { columns: 2, rows: 4 },
        "hardcoded",
      );

      expect(record.families).toStrictEqual([]);
      expect(record.characteristics).toContain("isJunctionFree");
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
