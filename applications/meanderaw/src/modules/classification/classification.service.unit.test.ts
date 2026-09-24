import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  MEANDER_FAMILIES,
  STRUCTURAL_MINIMUM_ROWS,
} from "./classification.constants";
import { ClassificationService } from "./classification.service";

import type { Characteristics } from "../characteristics/characteristics.types";
import type { MeanderShape } from "./classification.types";

const defaultCharacteristics: Characteristics = {
  arcadePillarCount: 0,
  bifurcationCount: 0,
  combSpineCount: 0,
  componentCount: 0,
  components: 0,
  cornerCount: 0,
  crossesTheSeam: false,
  cycleCount: 0,
  cycles: 0,
  density: 0,
  dotCount: 0,
  edgeCount: 0,
  embeddedOCount: 0,
  embeddedUCount: 0,
  endsAreLatticeNeighbors: false,
  endsOnBorderRules: false,
  freeEnds: 0,
  hasArcadePillars: false,
  hasBranching: false,
  hasCombSpine: false,
  hasCrossing: false,
  hasDots: false,
  hasTJunctions: false,
  hasXJunctions: false,
  horizontalDashCount: 0,
  horizontalPointCount: 0,
  inkPointCount: 0,
  inkTJunctions: 0,
  inkXJunctions: 0,
  isClosedLoop: false,
  isConnected: false,
  isFlipSymmetric: false,
  isFork: false,
  isJunctionFree: true,
  isMirrorSymmetric: false,
  isPureTree: false,
  isReducible: false,
  isSingleArc: false,
  isStippled: false,
  lCount: 0,
  longestHorizontalRun: 0,
  longestVerticalRun: 0,
  oCount: 0,
  pitch: 0,
  plusCount: 0,
  reversesAtItsTightestTurn: false,
  seamComponents: 0,
  seamCycles: 0,
  seamTJunctions: 0,
  seamXJunctions: 0,
  shapeICount: 0,
  tCount: 0,
  turnsMonotonically: false,
  uCount: 0,
  verticalDashCount: 0,
  verticalPointCount: 0,
  xCount: 0,
};

const createMockCharacteristics = (
  overrides: Partial<Characteristics> = {},
): Characteristics => ({
  ...defaultCharacteristics,
  ...overrides,
});

describe(ClassificationService, () => {
  let service: ClassificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ClassificationService],
    }).compile();

    service = await module.resolve(ClassificationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("exports supported families in precedence order", () => {
    expect(MEANDER_FAMILIES).toStrictEqual([
      "parallel",
      "cross",
      "arcade",
      "comb",
      "fork",
      "tree",
      "boxes",
      "whirl",
      "swirl",
      "chain",
      "clasps",
      "snake",
      "stipple",
      "unclassified",
    ]);
  });

  describe("classify", () => {
    it("classifies parallel bundles correctly", () => {
      const pitch = 4;
      const components = 3;
      const freeEnds = 6;
      const characteristics = createMockCharacteristics({
        components,
        cycles: 0,
        freeEnds,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("parallel");
    });

    it("classifies cross meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        inkTJunctions: 0,
        inkXJunctions: 2,
      });
      const shape: MeanderShape = { columns: 5, rows: 6 };

      expect(service.classify(characteristics, shape)).toBe("cross");
    });

    it("classifies arcade meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        hasArcadePillars: true,
        inkTJunctions: 4,
        inkXJunctions: 0,
      });
      const shape: MeanderShape = { columns: 4, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("arcade");
    });

    it("classifies comb meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        hasCombSpine: true,
        inkTJunctions: 3,
        inkXJunctions: 0,
      });
      const shape: MeanderShape = { columns: 2, rows: 4 };

      expect(service.classify(characteristics, shape)).toBe("comb");
    });

    it("classifies fork meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        dotCount: 0,
        freeEnds: 3,
        inkTJunctions: 1,
        inkXJunctions: 0,
        isFork: true,
      });
      const shape: MeanderShape = { columns: 3, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("fork");
    });

    it("classifies tree meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        dotCount: 0,
        freeEnds: 4,
        inkTJunctions: 2,
        inkXJunctions: 0,
        isPureTree: true,
      });
      const shape: MeanderShape = { columns: 3, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("tree");
    });

    it("classifies stipple meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        components: 3,
        dotCount: 2,
        inkTJunctions: 1,
        isStippled: true,
      });
      const shape: MeanderShape = { columns: 4, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("stipple");
    });

    it("classifies boxes meanders correctly", () => {
      const rows = 3;
      const pitch = rows - 1;
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("boxes");
    });

    it("classifies whirl meanders correctly", () => {
      const rows = 4;
      const pitch = rows;
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("whirl");
    });

    it("classifies swirl meanders correctly", () => {
      const rows = 4;
      const pitch = 2 * rows - 3;
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("swirl");
    });

    it("classifies chain meanders with connected links correctly", () => {
      const characteristics = createMockCharacteristics({
        crossesTheSeam: true,
        cycles: 0,
        inkTJunctions: 0,
        inkXJunctions: 0,
        reversesAtItsTightestTurn: true,
      });
      const shape: MeanderShape = { columns: 4, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("chain");
    });

    it("classifies clasps meanders with disconnected links correctly", () => {
      const characteristics = createMockCharacteristics({
        crossesTheSeam: false,
        cycles: 0,
        inkTJunctions: 0,
        inkXJunctions: 0,
        reversesAtItsTightestTurn: true,
      });
      const shape: MeanderShape = { columns: 4, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("clasps");
    });

    it("classifies snake meanders correctly", () => {
      const rows = 4;
      const pitch = rows - 1;
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 1,
        freeEnds: 0,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isClosedLoop: true,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("snake");
    });

    it("returns unclassified when no rule matches", () => {
      const characteristics = createMockCharacteristics({
        components: 2,
        cycles: 2,
      });
      const shape: MeanderShape = { columns: 4, rows: 4 };

      expect(service.classify(characteristics, shape)).toBe("unclassified");
    });

    it("respects minimum row constraints and falls back to unclassified", () => {
      const characteristics = createMockCharacteristics({
        inkTJunctions: 0,
        inkXJunctions: 2,
      });
      const shape: MeanderShape = {
        columns: 5,
        rows: STRUCTURAL_MINIMUM_ROWS.cross - 1,
      };

      expect(service.classify(characteristics, shape)).toBe("unclassified");
    });

    it("prioritizes boxes over chain when both match at rows >= 4", () => {
      const rows = 4;
      const pitch = rows - 1;
      const characteristics = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("boxes");
    });

    it("verifies hierarchical precedence from parallel through snake", () => {
      // 1. parallel takes precedence when bundle conditions are satisfied
      const bundle = createMockCharacteristics({
        components: 3,
        cycles: 0,
        freeEnds: 6,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 4,
      });

      expect(service.classify(bundle, { columns: 4, rows: 4 })).toBe(
        "parallel",
      );

      // 2. cross takes precedence
      const cross = createMockCharacteristics({
        inkTJunctions: 0,
        inkXJunctions: 1,
      });

      expect(service.classify(cross, { columns: 5, rows: 6 })).toBe("cross");

      // 3. fork takes precedence over boxes/whirl/swirl/chain/snake
      const fork = createMockCharacteristics({
        components: 1,
        cycles: 0,
        dotCount: 0,
        freeEnds: 3,
        inkTJunctions: 1,
        inkXJunctions: 0,
        isFork: true,
        pitch: 3,
      });

      expect(service.classify(fork, { columns: 3, rows: 4 })).toBe("fork");
    });

    it("evaluates chain and clasps rule matches directly", () => {
      const rows = 4;
      const pitch = rows - 1;
      const chainStructure = {
        characteristics: createMockCharacteristics({
          crossesTheSeam: true,
          cycles: 0,
          inkTJunctions: 0,
          inkXJunctions: 0,
          pitch,
          reversesAtItsTightestTurn: true,
        }),
        columns: pitch,
        rows,
      };
      const claspsStructure = {
        characteristics: createMockCharacteristics({
          crossesTheSeam: false,
          cycles: 0,
          inkTJunctions: 0,
          inkXJunctions: 0,
          pitch,
          reversesAtItsTightestTurn: true,
        }),
        columns: pitch,
        rows,
      };
      const chainRule = service.rules().find((r) => r.name === "chain");
      const claspsRule = service.rules().find((r) => r.name === "clasps");

      expect(chainRule?.matches(chainStructure)).toBe(true);
      expect(chainRule?.matches(claspsStructure)).toBe(false);
      expect(claspsRule?.matches(claspsStructure)).toBe(true);
      expect(claspsRule?.matches(chainStructure)).toBe(false);
    });

    it("tests individual branch conditions for isBundle, isArc, and isClosedLoop", () => {
      const oddPitchBundle = createMockCharacteristics({
        components: 2,
        cycles: 0,
        freeEnds: 4,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 3,
      });

      expect(service.classify(oddPitchBundle, { columns: 3, rows: 4 })).toBe(
        "unclassified",
      );

      const cycleBundle = createMockCharacteristics({
        components: 3,
        cycles: 1,
        freeEnds: 6,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 4,
      });

      expect(service.classify(cycleBundle, { columns: 4, rows: 4 })).toBe(
        "unclassified",
      );

      const wrongEndsArc = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 1,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 3,
      });

      expect(service.classify(wrongEndsArc, { columns: 3, rows: 4 })).toBe(
        "unclassified",
      );

      const notClosedLoop = createMockCharacteristics({
        components: 1,
        cycles: 0,
        freeEnds: 0,
        inkTJunctions: 0,
        inkXJunctions: 0,
        pitch: 3,
      });

      expect(service.classify(notClosedLoop, { columns: 3, rows: 4 })).toBe(
        "unclassified",
      );
    });
  });
});
