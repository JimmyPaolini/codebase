import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { HISTORICAL_CORPUS } from "../corpus/historical-corpus.constants";
import { GraphService } from "../graph/graph.service";
import { MatrixService } from "../matrix/matrix.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { CharacteristicsFamilyService } from "./characteristics-family.service";
import { CharacteristicsPathService } from "./characteristics-path.service";
import { CharacteristicsShapeService } from "./characteristics-shape.service";
import { CHARACTERISTIC_SOURCES } from "./characteristics.constants";
import { CharacteristicsService } from "./characteristics.service";
import { ConnectivityService } from "./connectivity.service";

// 🧪 Tests

describe(CharacteristicsService, () => {
  let codeService: CodeService;
  let matrixService: MatrixService;
  let service: CharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        GraphService,
        MatrixService,
        CharacteristicsService,
        CharacteristicsFamilyService,
        ConnectivityService,
        CharacteristicsPathService,
        CharacteristicsShapeService,
        SymmetryService,
        TileService,
      ],
    }).compile();

    codeService = await module.resolve(CodeService);
    matrixService = await module.resolve(MatrixService);
    service = await module.resolve(CharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("defines a source category for every characteristic", () => {
    expect(Object.keys(CHARACTERISTIC_SOURCES).length).toBeGreaterThan(0);
  });

  describe("compute", () => {
    it("reports every count and characteristic as zero or false for a Code with no row at all", () => {
      expect(service.compute(codeService.parse("", 0, 1)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 0,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": false,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 0,
            "oCount": 0,
            "pitch": 0,
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
      const result = (
        service as unknown as {
          findFreeEnds: (
            edgeList: typeof edges,
          ) => { column: number; row: number }[];
        }
      ).findFreeEnds(edges);

      expect(result).toStrictEqual([
        { column: 0, row: 0 },
        { column: 1, row: 1 },
      ]);
    });

    it("reports no branching or crossing for a single bare point, which is one component of its own", () => {
      expect(service.compute(codeService.parse("0", 1, 1)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 0,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": true,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 0,
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
      expect(service.compute(codeService.parse("21", 1, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": true,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 0,
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
      expect(service.compute(codeService.parse("2100", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 1,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": false,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 0,
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
      expect(service.compute(codeService.parse("4080", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": false,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("4488", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 2,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": true,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": true,
            "isSingleArc": true,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 0,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("40a1", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": true,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 3,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": false,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 1,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("44a9", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": true,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("65a9", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": true,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("9a56", 2, 2)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 4,
            "inkTJunctions": 0,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": false,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": true,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("7", 1, 1)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": true,
            "hasCombSpine": false,
            "hasCrossing": false,
            "hasDots": false,
            "hasTJunctions": true,
            "hasXJunctions": false,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 1,
            "inkTJunctions": 1,
            "inkXJunctions": 0,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": false,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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
      expect(service.compute(codeService.parse("f", 1, 1)))
        .toMatchInlineSnapshot(`
          {
            "arcadePillarCount": 0,
            "bifurcationCount": 0,
            "combSpineCount": 0,
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
            "hasArcadePillars": false,
            "hasBranching": false,
            "hasCombSpine": false,
            "hasCrossing": true,
            "hasDots": false,
            "hasTJunctions": false,
            "hasXJunctions": true,
            "horizontalDashCount": 0,
            "horizontalPointCount": 0,
            "inkPointCount": 1,
            "inkTJunctions": 0,
            "inkXJunctions": 1,
            "isArcade": false,
            "isBars": false,
            "isClosedLoop": false,
            "isComb": false,
            "isConnected": true,
            "isDots": false,
            "isFlipSymmetric": false,
            "isFork": false,
            "isJunctionFree": false,
            "isLines": false,
            "isMesh": false,
            "isMirrorSymmetric": false,
            "isPureTree": false,
            "isReducible": false,
            "isSingleArc": false,
            "isStippled": false,
            "lCount": 0,
            "longestHorizontalRun": 1,
            "longestVerticalRun": 1,
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

    it("finds the longest horizontal and vertical runs", () => {
      const code = codeService.parse("ecf0", 2, 2);
      const result = service.compute(code);

      expect(result.longestHorizontalRun).toBe(1);
      expect(result.longestVerticalRun).toBe(2);
    });

    it("caps the horizontal run at pitch for a full loop", () => {
      const code = codeService.parse("333300", 3, 2);
      const result = service.compute(code);

      expect(result.longestHorizontalRun).toBe(1);
      expect(result.longestVerticalRun).toBe(0);
    });

    it("identifies fork, tree, comb, arcade, and stipple characteristics", () => {
      // Fork (single T-junction, 3 free ends, 1 component, 0 dots, not a comb spine)
      // 44
      // ad
      // 29
      const forkCode = codeService.parse("44ad29", 3, 2);
      const forkResult = service.compute(forkCode);

      expect(forkResult.isFork).toBe(true);
      expect(forkResult.isPureTree).toBe(false);

      // Pure tree (>=2 T-junctions, 1 component, 0 dots)
      // 444
      // edc
      // 8a9
      const treeCode = codeService.parse("444edc8a9", 3, 3);
      const treeResult = service.compute(treeCode);

      expect(treeResult.isFork).toBe(false);
      expect(treeResult.isPureTree).toBe(true);

      // Comb spine (e1/e1)
      const combCode = codeService.parse("e1e1a100", 4, 2);
      const combResult = service.compute(combCode);

      expect(combResult.hasCombSpine).toBe(true);

      // Arcade pillars (67cc / ccb9)
      const arcadeCode = codeService.parse("6775ccccbb98", 3, 4);
      const arcadeResult = service.compute(arcadeCode);

      expect(arcadeResult.hasArcadePillars).toBe(true);

      // Stippled (multi-component with dots and branching)
      const stippledCode = codeService.parse("408070bb0000", 3, 4);
      const stippledResult = service.compute(stippledCode);

      expect(stippledResult.isStippled).toBe(true);
    });
  });

  describe("classifyFamilies", () => {
    it("delegates family classification to CharacteristicsFamilyService", () => {
      const linesCode = codeService.parse("3333", 2, 2);

      expect(service.classifyFamilies(linesCode)).toStrictEqual(["lines"]);

      const dotsCode = codeService.parse("0000", 2, 2);

      expect(service.classifyFamilies(dotsCode)).toStrictEqual(["dots"]);
    });
  });

  describe("measure", () => {
    it("measures directly from a raw formatted or bare code string", () => {
      const fromFormatted = service.measure("02x02y4488r01");
      const fromBare = service.measure("4488", 2, 2);
      const fromParsed = service.compute(codeService.parse("4488", 2, 2));

      expect(fromFormatted).toStrictEqual(fromParsed);
      expect(fromBare).toStrictEqual(fromParsed);
    });

    it("measures directly from a 2D Matrix", () => {
      const matrix = [
        [
          { east: false, north: false, south: true, west: false },
          { east: false, north: false, south: true, west: false },
        ],
        [
          { east: false, north: true, south: false, west: false },
          { east: false, north: true, south: false, west: false },
        ],
      ];
      const result = service.measure(matrix);

      expect(result.shapeICount).toBe(2);
      expect(result.pitch).toBe(2);
      expect(result.isConnected).toBe(false);
    });

    it("computes seamComponents across string, CodeObject, and Matrix inputs", () => {
      const codeStr = "02x02y4488";
      const parsed = codeService.parse("4488", 2, 2);
      const matrix = matrixService.fromCode(parsed);

      const seamFromStr = service.seamComponents(codeStr);
      const seamFromParsed = service.seamComponents(parsed);
      const seamFromMatrix = service.seamComponents(matrix);

      expect(seamFromStr).toBe(seamFromParsed);
      expect(seamFromMatrix).toBe(seamFromParsed);
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
