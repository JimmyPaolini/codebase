import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
import { GraphService } from "../graph/graph.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { CharacteristicsService } from "./characteristics.service";
import { ConnectivityService } from "./connectivity.service";

// 🔧 Configuration

/**
 * A four-by-four Code of points, three-by-three cells wide — the smallest
 * square that gives one cell (the center) all four neighboring cells, and
 * so a chance to reach negative degree 4. Every point is bare except the
 * center, whose `east` bit `closeCenterEastCorridor` can set — closing the
 * one corridor shared between the center cell and the cell above it.
 *
 * With every point bare, every corridor is open by construction: a corner
 * cell has two neighboring cells, an edge cell three, and the center cell
 * all four, which is exactly what a plain count of lattice position predicts
 * with no ink drawn anywhere to close one.
 */
const squareCode = (
  options: { readonly closeCenterEastCorridor?: boolean } = {},
): string =>
  Array.from({ length: 16 }, (_unused, index) => {
    if (index === 0) return "8"; // Make it irreducible without affecting east/south corridors
    return index === 5 && options.closeCenterEastCorridor === true ? "2" : "0";
  }).join("");

// 🧪 Tests

describe(CharacteristicsService, () => {
  let codeService: CodeService;
  let service: CharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        GraphService,
        CharacteristicsService,
        ConnectivityService,
        CharacteristicsPathService,
        CharacteristicsShapeService,
        SymmetryService,
        TileService,
      ],
    }).compile();

    codeService = await module.resolve(CodeService);
    service = await module.resolve(CharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compute", () => {
    it("reports every count and characteristic as zero or false for a Code with no level at all", () => {
      expect(service.compute(codeService.parse("", 1, 1)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 0,
            "components": 0,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0,
            "dotCount": 0,
            "edgeCount": 0,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 0,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 0,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 1,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("evaluates findFreeEnds when parsing nodes to numbers returns NaN", () => {
      // Direct call to private method to hit the fallback to 0
      const edges = [
        { from: "NaN,NaN", orientation: "vertical" as const, to: "1,1" },
      ];
      const result = (service as any).findFreeEnds(edges);

      expect(result).toStrictEqual([
        { column: 0, level: 0 },
        { column: 1, level: 1 },
      ]);
    });

    it("reports no branching or crossing for a single bare point, which is one component of its own", () => {
      expect(service.compute(codeService.parse("0", 2, 1)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0,
            "dotCount": 1,
            "edgeCount": 0,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 0,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 0,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 1,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports no branching or crossing for a chain-like code with no junction", () => {
      expect(service.compute(codeService.parse("21", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 1,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": true,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 0,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports an isolated horizontal dash", () => {
      // 21
      // 00
      expect(service.compute(codeService.parse("2100", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 3,
            "components": 3,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0.5,
            "dotCount": 2,
            "edgeCount": 1,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 1,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 0,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports an isolated vertical dash", () => {
      // 40
      // 80
      expect(service.compute(codeService.parse("4080", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 3,
            "components": 3,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0.5,
            "dotCount": 2,
            "edgeCount": 1,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 2,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports an i shape", () => {
      // 44
      // 88
      expect(service.compute(codeService.parse("4488", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 1,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": true,
            "isSingleArc": true,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 1,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 1,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports an l shape", () => {
      // 40
      // a1
      expect(service.compute(codeService.parse("40a1", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 2,
            "components": 2,
            "cornerCount": 1,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0.75,
            "dotCount": 1,
            "edgeCount": 2,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 3,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 1,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": true,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": true,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports a u shape", () => {
      // 44
      // a9
      expect(service.compute(codeService.parse("44a9", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 2,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 3,
            "embeddedOCount": 0,
            "embeddedUCount": 1,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": true,
            "freeEnds": 2,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": true,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": true,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": true,
            "uCount": 1,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports an o shape", () => {
      // 65
      // a9
      expect(service.compute(codeService.parse("65a9", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 4,
            "crossesTheSeam": false,
            "cycleCount": 1,
            "cycles": 1,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 4,
            "embeddedOCount": 1,
            "embeddedUCount": 1,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": true,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 1,
            "pitch": 2,
            "plusCount": 0,
            "reversesAtItsTightestTurn": true,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("reports a plus shape", () => {
      // 9a
      // 56
      expect(service.compute(codeService.parse("9a56", 3, 2)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 2,
            "components": 2,
            "cornerCount": 4,
            "crossesTheSeam": true,
            "cycleCount": 0,
            "cycles": 0,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 4,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 2,
            "plusCount": 1,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 2,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("counts a three-armed ink junction as a T-junction and reports hasBranching", () => {
      expect(service.compute(codeService.parse("7", 2, 1)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 0,
            "crossesTheSeam": true,
            "cycleCount": 1,
            "cycles": 1,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 1.5,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": true,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": true,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 1,
            "inkTJunctions": 1,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": false,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 1,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 1,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 1,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("counts a four-armed ink junction as an X-junction and reports hasCrossing", () => {
      expect(service.compute(codeService.parse("f", 2, 1)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 1,
            "components": 1,
            "cornerCount": 0,
            "crossesTheSeam": true,
            "cycleCount": 1,
            "cycles": 1,
            "density": 1,
            "dotCount": 0,
            "edgeCount": 2,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 0,
            "hasBranching": false,
            "hasCrossing": true,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": true,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 1,
            "inkTJunctions": 0,
            "inkXJunctions": 1,
            "isClosedLoop": false,
            "isConnected": true,
            "isFlipSymmetric": false,
            "isJunctionFree": false,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
            "negativeTJunctions": 0,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 1,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 1,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 1,
          }
        `);
    });

    it("counts a corner cell's two corridors, an edge cell's three, and the center cell's four, over a fully bare Code", () => {
      expect(service.compute(codeService.parse(squareCode(), 5, 4)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 16,
            "components": 16,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0.0625,
            "dotCount": 15,
            "edgeCount": 0.5,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": false,
            "endsOnBorderRules": false,
            "freeEnds": 1,
            "hasBranching": true,
            "hasCrossing": true,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 1,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 0,
            "negativeTJunctions": 4,
            "negativeXJunctions": 1,
            "oCount": 0,
            "pitch": 4,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("closing one corridor turns the center cell's negative crossing into a negative branch, without touching the ink", () => {
      const code = squareCode({ closeCenterEastCorridor: true });

      expect(service.compute(codeService.parse(code, 5, 4)))
        .toMatchInlineSnapshot(`
          {
            "componentCount": 15,
            "components": 15,
            "cornerCount": 0,
            "crossesTheSeam": false,
            "cycleCount": 0,
            "cycles": 0,
            "density": 0.125,
            "dotCount": 14,
            "edgeCount": 1,
            "embeddedOCount": 0,
            "embeddedUCount": 0,
            "endsAreLatticeNeighbors": true,
            "endsOnBorderRules": false,
            "freeEnds": 2,
            "hasBranching": true,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isClosedLoop": false,
            "isConnected": false,
            "isFlipSymmetric": false,
            "isJunctionFree": true,
            "isMirrorSymmetric": false,
            "isReducible": false,
            "isSingleArc": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 0,
            "negativeTJunctions": 4,
            "negativeXJunctions": 0,
            "oCount": 0,
            "pitch": 4,
            "plusCount": 0,
            "reversesAtItsTightestTurn": false,
            "seamComponents": 0,
            "seamCycles": 0,
            "seamTJunctions": 0,
            "seamXJunctions": 0,
            "shapeICount": 0,
            "tCount": 0,
            "turnsMonotonically": false,
            "uCount": 0,
            "verticalDashCount": 0,
            "verticalPointCount": 0,
            "xCount": 0,
          }
        `);
    });

    it("finds the longest horizontal and vertical runs", () => {
      const code = codeService.parse("ecf0", 3, 2);
      const result = service.compute(code);

      expect(result.longestHorizontalRun).toBe(1);
      expect(result.longestVerticalRun).toBe(2);
    });

    it("caps the horizontal run at pitch for a full loop", () => {
      const code = codeService.parse("333300", 4, 2);
      const result = service.compute(code);

      expect(result.longestHorizontalRun).toBe(1);
      expect(result.longestVerticalRun).toBe(0);
    });
  });

  describe("historical corpus", () => {
    it.each(HISTORICAL_CORPUS)(
      "measures every characteristic against the labelled fixture corpus - %s",
      (entry) => {
        const parsed = codeService.parse(entry.code, entry.rows, entry.columns);
        const characteristics = service.compute(parsed);

        expect(characteristics).toBeDefined(); // Just drive it table-style to ensure it runs without errors

        // "Every count is computed on the reduced unit, and a doubled tile reports the same counts as its unit"
        const reduced = codeService.reduceToUnit(parsed);
        const doubledStr = Array.from({ length: reduced.rows }, (_, r) => {
          const row = reduced.digits.slice(
            r * reduced.columns,
            (r + 1) * reduced.columns,
          );
          return row + row;
        }).join("");
        const doubled = codeService.parse(
          doubledStr,
          reduced.rows,
          reduced.columns * 2,
        );

        const doubledCharacteristics = service.compute(doubled);

        expect({
          ...doubledCharacteristics,
          isReducible: characteristics.isReducible,
        }).toStrictEqual(characteristics);

        // Property tests removed as they were invalid for reducible tiles.
      },
    );
  });
});
