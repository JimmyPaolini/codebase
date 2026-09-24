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
  hasBranching: false,
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
  isJunctionFree: true,
  isMirrorSymmetric: false,
  isReducible: false,
  isSingleArc: false,
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
      "branch",
      "boxes",
      "waterfalls",
      "whirl",
      "swirl",
      "chain",
      "clasps",
      "snake",
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

    it("classifies branch meanders correctly", () => {
      const characteristics = createMockCharacteristics({
        cycles: 0,
        inkTJunctions: 2,
        inkXJunctions: 0,
      });
      const shape: MeanderShape = { columns: 4, rows: 3 };

      expect(service.classify(characteristics, shape)).toBe("branch");
    });

    it("classifies boxes meanders correctly", () => {
      const rows = 4;
      const pitch = rows - 1;
      const characteristics = createMockCharacteristics({
        components: 1,
        crossesTheSeam: true,
        cycles: 0,
        embeddedUCount: 1,
        endsAreLatticeNeighbors: false,
        endsOnBorderRules: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        longestHorizontalRun: 2,
        longestVerticalRun: 1,
        pitch,
        reversesAtItsTightestTurn: true,
      });
      const shape: MeanderShape = { columns: pitch, rows };

      expect(service.classify(characteristics, shape)).toBe("boxes");
    });

    it("classifies waterfalls meanders correctly across row sizes and column sizes", () => {
      for (const rows of [2, 3, 4, 5, 6, 7, 8]) {
        for (const columns of [2, 3, 4, 5, 6]) {
          const characteristics = createMockCharacteristics({
            components: 1,
            crossesTheSeam: true,
            cycles: 0,
            endsAreLatticeNeighbors: false,
            endsOnBorderRules: true,
            freeEnds: 2,
            inkTJunctions: 0,
            inkXJunctions: 0,
            isSingleArc: true,
            longestHorizontalRun: columns - 1,
            longestVerticalRun: 1,
            pitch: columns,
            reversesAtItsTightestTurn: true,
          });
          const shape: MeanderShape = { columns, rows };

          expect(service.classify(characteristics, shape)).toBe("waterfalls");
        }
      }
    });

    it("does not classify invalid 3x2 meanders as boxes", () => {
      // 02x03y52a529: rows === 3 < STRUCTURAL_MINIMUM_ROWS.boxes (4)
      const spiral3x2 = createMockCharacteristics({
        components: 1,
        crossesTheSeam: true,
        cycles: 0,
        embeddedUCount: 1,
        endsAreLatticeNeighbors: false,
        endsOnBorderRules: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        longestHorizontalRun: 2,
        longestVerticalRun: 1,
        pitch: 2,
        reversesAtItsTightestTurn: true,
      });

      expect(service.classify(spiral3x2, { columns: 2, rows: 3 })).not.toBe(
        "boxes",
      );

      // 02x03y2569a1: does not cross the seam
      const noSeam = createMockCharacteristics({
        components: 1,
        crossesTheSeam: false,
        cycles: 0,
        endsAreLatticeNeighbors: false,
        endsOnBorderRules: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch: 2,
        reversesAtItsTightestTurn: true,
      });

      expect(service.classify(noSeam, { columns: 2, rows: 3 })).not.toBe(
        "boxes",
      );

      // 02x03y44cca9: monotonic turn, ends are lattice neighbors
      const monotonicNeighbors = createMockCharacteristics({
        components: 1,
        crossesTheSeam: false,
        cycles: 0,
        endsAreLatticeNeighbors: true,
        endsOnBorderRules: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch: 2,
        turnsMonotonically: true,
      });

      expect(
        service.classify(monotonicNeighbors, { columns: 2, rows: 3 }),
      ).not.toBe("boxes");

      // 02x03y56c8a1: ends are lattice neighbors
      const seamNeighbors = createMockCharacteristics({
        components: 1,
        crossesTheSeam: true,
        cycles: 0,
        endsAreLatticeNeighbors: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch: 2,
        reversesAtItsTightestTurn: true,
      });

      expect(service.classify(seamNeighbors, { columns: 2, rows: 3 })).not.toBe(
        "boxes",
      );

      // 02x03y65c8a1: ends are lattice neighbors, no seam
      const noSeamNeighbors = createMockCharacteristics({
        components: 1,
        crossesTheSeam: false,
        cycles: 0,
        endsAreLatticeNeighbors: true,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        pitch: 2,
        reversesAtItsTightestTurn: true,
      });

      expect(
        service.classify(noSeamNeighbors, { columns: 2, rows: 3 }),
      ).not.toBe("boxes");
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
        crossesTheSeam: true,
        cycles: 0,
        endsAreLatticeNeighbors: false,
        freeEnds: 2,
        inkTJunctions: 0,
        inkXJunctions: 0,
        isSingleArc: true,
        longestHorizontalRun: 2,
        pitch,
        reversesAtItsTightestTurn: true,
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

      // 2. cross takes precedence over branch when inkXJunctions > 0 and inkTJunctions === 0
      const cross = createMockCharacteristics({
        inkTJunctions: 0,
        inkXJunctions: 1,
      });

      expect(service.classify(cross, { columns: 5, rows: 6 })).toBe("cross");

      // 3. branch takes precedence over boxes/whirl/swirl/chain/snake when inkTJunctions > 0
      const branch = createMockCharacteristics({
        cycles: 0,
        inkTJunctions: 1,
        inkXJunctions: 0,
        pitch: 3,
      });

      expect(service.classify(branch, { columns: 3, rows: 4 })).toBe("branch");
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
