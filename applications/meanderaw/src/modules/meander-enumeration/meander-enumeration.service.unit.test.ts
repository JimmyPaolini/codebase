import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LatticeIdentificationService } from "../lattice-identification/lattice-identification.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MosaicNamingService } from "../mosaic-naming/mosaic-naming.service";
import { MosaicSymmetryService } from "../mosaic-tile/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-tile/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-tile/mosaic-tiles.service";

import { MeanderEnumerationService } from "./meander-enumeration.service";

// 🧪 Tests

describe(MeanderEnumerationService, () => {
  let service: MeanderEnumerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LatticeIdentificationService,
        MeanderEnumerationService,
        MeanderLatticeService,
        MosaicNamingService,
        MosaicSymmetryService,
        MosaicTileService,
        MosaicTilesService,
      ],
    }).compile();

    service = await module.resolve(MeanderEnumerationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("shapes", () => {
    // 🎯 The whole sweep, as the two numbers that decide it: the edge budget,
    // and the shallowest repeat worth walking. Eleven of these fourteen
    // shapes are the ones the `mosaic` half of the corpus already commits;
    // the three deeper single-column ones are what the budget admits past
    // that family's own row ceiling, and are new to this sweep.
    it("sweeps every shape the edge budget admits, from the shallowest repeat upward", () => {
      expect(
        service.shapes().map(({ columns, rows }) => `${rows}r${columns}c`),
      ).toStrictEqual([
        "3r1c",
        "3r2c",
        "3r3c",
        "3r4c",
        "3r5c",
        "4r1c",
        "4r2c",
        "4r3c",
        "5r1c",
        "5r2c",
        "6r1c",
        "7r1c",
        "8r1c",
        "9r1c",
      ]);
    });

    it("admits every shape it sweeps, so no shape is refused for want of budget once the sweep has begun", () => {
      expect(service.shapes().every((shape) => service.isAdmitted(shape))).toBe(
        true,
      );
    });
  });

  describe("enumerate", () => {
    // 🎯 The counts the `mosaic` half of the corpus is committed at, which
    // this enumeration reproduces exactly — the same walk over the same
    // space, folded by the same symmetry group, now run for every family
    // rather than for one.
    it.each([
      { columns: 1, count: 6, rows: 3 },
      { columns: 2, count: 21, rows: 3 },
      { columns: 3, count: 74, rows: 3 },
      { columns: 1, count: 20, rows: 4 },
      { columns: 1, count: 72, rows: 5 },
      { columns: 1, count: 272, rows: 6 },
    ])(
      "finds $count distinct meanders at $rows rows and $columns columns",
      ({ columns, count, rows }) => {
        expect(service.enumerate({ columns, rows })).toHaveLength(count);
      },
    );

    // 🎯 The whole space at its smallest shape, spelled out: two inked dots,
    // one vertical bar, one wrapped rule, a bar beside a rule, two rules —
    // which is the `lines` region — and every edge there is, which is
    // `mesh`. The order is the canonical edge key's, which is what makes the
    // sweep stable across runs rather than dependent on which member of a
    // symmetry class the walk happened to reach first.
    it("spells each one by its Code, at the shape it was enumerated at", () => {
      expect(service.enumerate({ columns: 1, rows: 3 })).toStrictEqual([
        { code: "00", columns: 1, rows: 3 },
        { code: "48", columns: 1, rows: 3 },
        { code: "03", columns: 1, rows: 3 },
        { code: "4b", columns: 1, rows: 3 },
        { code: "33", columns: 1, rows: 3 },
        { code: "7b", columns: 1, rows: 3 },
      ]);
    });

    it("produces no two meanders sharing a Code, since a Code is a meander's whole identity", () => {
      const codes = service
        .enumerate({ columns: 2, rows: 4 })
        .map(({ code }) => code);

      expect(new Set(codes).size).toBe(codes.length);
    });

    it("refuses a shape the budget does not admit, rather than walking it slowly", () => {
      expect(() => service.enumerate({ columns: 2, rows: 6 })).toThrow(
        /past the budget/u,
      );
    });
  });
});
