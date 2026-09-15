import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeService } from "../code/code.service";
import { GraphService } from "../graph/graph.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";

import { MeanderCharacteristicsService } from "./meander-characteristics.service";
import { MeanderConnectivityService } from "./meander-connectivity.service";

import type { MeanderCharacteristics } from "./meander-characteristics.types";

// 🔧 Configuration

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
  Array.from({ length: 16 }, (_unused, index) =>
    index === 5 && options.closeCenterEastCorridor === true ? "2" : "0",
  ).join("");

// 🧪 Tests

describe(MeanderCharacteristicsService, () => {
  let codeService: CodeService;
  let service: MeanderCharacteristicsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodeService,
        GraphService,
        MeanderCharacteristicsService,
        MeanderConnectivityService,
        MosaicSymmetryService,
        MosaicTileService,
      ],
    }).compile();

    codeService = await module.resolve(CodeService);
    service = await module.resolve(MeanderCharacteristicsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compute", () => {
    it("reports every count and characteristic as zero or false for a Code with no level at all", () => {
      expect(service.compute(codeService.parse("", 1, 1))).toStrictEqual(
        characteristics({}),
      );
    });

    it("reports no branching or crossing for a single bare point, which is one component of its own", () => {
      expect(service.compute(codeService.parse("0", 2, 1))).toStrictEqual(
        characteristics({ components: 1 }),
      );
    });

    it("reports no branching or crossing for a chain-like code with no junction", () => {
      expect(service.compute(codeService.parse("21", 2, 2))).toStrictEqual(
        characteristics({ components: 1, freeEnds: 2 }),
      );
    });

    it("counts a three-armed ink junction as a T-junction and reports hasBranching", () => {
      expect(service.compute(codeService.parse("7", 2, 1))).toStrictEqual(
        characteristics({
          components: 1,
          cycles: 1,
          hasBranching: true,
          inkTJunctions: 1,
        }),
      );
    });

    it("counts a four-armed ink junction as an X-junction and reports hasCrossing", () => {
      expect(service.compute(codeService.parse("f", 2, 1))).toStrictEqual(
        characteristics({
          components: 1,
          cycles: 1,
          hasCrossing: true,
          inkXJunctions: 1,
        }),
      );
    });

    it("counts a corner cell's two corridors, an edge cell's three, and the center cell's four, over a fully bare Code", () => {
      expect(
        service.compute(codeService.parse(squareCode(), 5, 4)),
      ).toStrictEqual(
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
      const code = squareCode({ closeCenterEastCorridor: true });

      expect(service.compute(codeService.parse(code, 5, 4))).toStrictEqual(
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
