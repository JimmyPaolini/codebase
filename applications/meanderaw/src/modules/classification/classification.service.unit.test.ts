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
      "whirl",
      "swirl",
      "chain",
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
  });
});
