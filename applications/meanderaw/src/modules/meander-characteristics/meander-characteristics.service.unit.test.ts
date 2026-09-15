import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GraphService } from "../graph/graph.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";

import { MeanderCharacteristicsService } from "./meander-characteristics.service";
import { MeanderConnectivityService } from "./meander-connectivity.service";

import type { MeanderPointDirections } from "../meander-decoding/meander-decoding.types";
import type { MeanderCharacteristics } from "./meander-characteristics.types";

// 🔧 Configuration

const bare: MeanderPointDirections = {
  east: false,
  north: false,
  south: false,
  west: false,
};

/** Every field `compute` returns, defaulted so a case reads as a whole result rather than a list of expectations. */
const characteristics = (
  options: Partial<MeanderCharacteristics>,
): MeanderCharacteristics => ({
  components: options.components ?? 0,
  cycles: options.cycles ?? 0,
  freeEnds: options.freeEnds ?? 0,
  hasBranching: options.hasBranching ?? false,
  hasCrossing: options.hasCrossing ?? false,
  inkTJunctions: options.inkTJunctions ?? 0,
  inkXJunctions: options.inkXJunctions ?? 0,
  negativeTJunctions: options.negativeTJunctions ?? 0,
  negativeXJunctions: options.negativeXJunctions ?? 0,
});

/**
 * A four-by-four grid of points, three-by-three cells wide — the smallest
 * square that gives one cell (the center) all four neighboring cells, and
 * so a chance to reach negative degree 4. Every point is bare except the
 * center, whose `east` bit `closeCenterEastCorridor` can set — closing the
 * one corridor shared between the center cell and the cell above it.
 *
 * With every point bare, every corridor is open by construction: a corner
 * cell has two neighboring cells, an edge cell three, and the center cell
 * all four, which is exactly what a plain count of grid position predicts
 * with no ink drawn anywhere to close one.
 */
const squareGrid = (
  options: { readonly closeCenterEastCorridor?: boolean } = {},
): MeanderPointDirections[][] =>
  Array.from({ length: 4 }, (_unused, level) =>
    Array.from({ length: 4 }, (_unused, column) =>
      level === 1 && column === 1
        ? { ...bare, east: options.closeCenterEastCorridor ?? false }
        : { ...bare },
    ),
  );

// 🧪 Tests

describe(MeanderCharacteristicsService, () => {
  let service: MeanderCharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderCharacteristicsService,
        MeanderConnectivityService,
        MeanderLatticeService,
        GraphService,
      ],
    }).compile();

    service = await module.resolve(MeanderCharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compute", () => {
    it("reports every count and characteristic as zero or false for an empty grid", () => {
      expect(service.compute([])).toStrictEqual(characteristics({}));
    });

    it("reports no branching or crossing for a single bare point, which is one component of its own", () => {
      expect(service.compute([[bare]])).toStrictEqual(
        characteristics({ components: 1 }),
      );
    });

    it("reports no branching or crossing for a chain-like code with no junction", () => {
      const grid = [
        [
          { east: true, north: false, south: false, west: false },
          { east: false, north: false, south: false, west: true },
        ],
      ];

      expect(service.compute(grid)).toStrictEqual(
        characteristics({ components: 1, freeEnds: 2 }),
      );
    });

    it("counts a three-armed ink junction as a T-junction and reports hasBranching", () => {
      const grid = [[{ east: true, north: false, south: true, west: true }]];

      expect(service.compute(grid)).toStrictEqual(
        characteristics({
          components: 1,
          cycles: 1,
          hasBranching: true,
          inkTJunctions: 1,
        }),
      );
    });

    it("counts a four-armed ink junction as an X-junction and reports hasCrossing", () => {
      const grid = [[{ east: true, north: true, south: true, west: true }]];

      expect(service.compute(grid)).toStrictEqual(
        characteristics({
          components: 1,
          cycles: 1,
          hasCrossing: true,
          inkXJunctions: 1,
        }),
      );
    });

    it("counts a corner cell's two corridors, an edge cell's three, and the center cell's four, over a fully bare grid", () => {
      expect(service.compute(squareGrid())).toStrictEqual(
        characteristics({
          components: 16,
          hasBranching: true,
          hasCrossing: true,
          negativeTJunctions: 4,
          negativeXJunctions: 1,
        }),
      );
    });

    it("closing one corridor turns the center cell's negative crossing into a negative branch, without touching the ink", () => {
      const grid = squareGrid({ closeCenterEastCorridor: true });

      expect(service.compute(grid)).toStrictEqual(
        characteristics({
          components: 15,
          freeEnds: 2,
          hasBranching: true,
          negativeTJunctions: 4,
        }),
      );
    });
  });
});
