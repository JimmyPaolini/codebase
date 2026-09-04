import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  MOSAIC_SUB_FAMILIES_BY_MARK_KIND,
  MOSAIC_TILE_MAXIMUM_COLUMNS,
  SUPPORTED_SUB_FAMILIES,
} from "./mosaic-motif.constants";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type {
  MosaicMarkKind,
  MosaicSubFamily,
  MosaicTile,
} from "./mosaic-motif.types";

// 🔧 Configuration

/**
 * The row counts `DrawPermutationsService.rowsSweep` enumerates, which is
 * the whole of the unit space this repository has materialized. Every
 * classification claim below is checked against all of it rather than
 * against a sample.
 */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/** Every sub-family a mark kind names, typed rather than widened for the command line. */
const NAMED_SUB_FAMILIES: readonly MosaicSubFamily[] = Object.values(
  MOSAIC_SUB_FAMILIES_BY_MARK_KIND,
);

// 🧪 Tests

describe(MosaicSubFamilyService, () => {
  let service: MosaicSubFamilyService;
  let mosaicSymmetryService: MosaicSymmetryService;
  let mosaicTilesService: MosaicTilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTilesService,
      ],
    }).compile();

    service = await module.resolve(MosaicSubFamilyService);
    mosaicSymmetryService = await module.resolve(MosaicSymmetryService);
    mosaicTilesService = await module.resolve(MosaicTilesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("classify", () => {
    it.each`
      kind            | subFamily
      ${"dot"}        | ${"dots"}
      ${"horizontal"} | ${"dashes"}
      ${"line"}       | ${"lines"}
      ${"vertical"}   | ${"diamond"}
    `(
      "names a tile built only of $kind marks $subFamily",
      ({
        kind,
        subFamily,
      }: {
        kind: MosaicMarkKind;
        subFamily: MosaicSubFamily;
      }) => {
        const tile: MosaicTile = {
          columns: 1,
          pieces: [0, 1].map((level) => ({ column: 0, kind, level })),
          rows: 4,
        };

        expect(service.classify(tile)).toBe(subFamily);
      },
    );

    it("leaves a tile that mixes mark kinds unnamed rather than naming it the nearest one", () => {
      const tile: MosaicTile = {
        columns: 1,
        pieces: [
          { column: 0, kind: "dot", level: 0 },
          { column: 0, kind: "vertical", level: 1 },
        ],
        rows: 4,
      };

      expect(service.classify(tile)).toBeUndefined();
    });

    it("leaves a tile carrying no marks at all unnamed, since it draws nothing to recognize", () => {
      expect(
        service.classify({ columns: 1, pieces: [], rows: 4 }),
      ).toBeUndefined();
    });
  });

  describe("tile", () => {
    it.each(NAMED_SUB_FAMILIES)(
      "builds a %s tile that classifies back as itself at every row count it exists at",
      (subFamily) => {
        const built = [4, 5, 6, 7, 8, 9, 10, 11, 12]
          .map((rows) => service.tile(subFamily, rows))
          .filter((tile) => tile !== undefined);

        expect(built.length).toBeGreaterThan(0);

        for (const tile of built) {
          expect(service.classify(tile)).toBe(subFamily);
        }
      },
    );

    it("can build every sub-family the command line offers, and offers every one it can build", () => {
      expect([...SUPPORTED_SUB_FAMILIES].toSorted()).toStrictEqual(
        [...NAMED_SUB_FAMILIES].toSorted(),
      );
    });

    it("has no diamond tile where the interior has an odd number of levels, since vertical dashes cover levels in pairs", () => {
      expect(service.tile("diamond", 6)).toBeUndefined();
      expect(service.tile("diamond", 8)).toBeUndefined();
      expect(service.tile("diamond", 5)).toBeDefined();
      expect(service.tile("diamond", 7)).toBeDefined();
    });

    it("has no tile at all where the bar has no interior level to mark", () => {
      expect(service.tile("dots", 1)).toBeUndefined();
    });

    it("spans two columns for dashes, whose mark reaches into the column beside it, and one for the rest", () => {
      expect(service.tile("dashes", 6)?.columns).toBe(2);
      expect(service.tile("diamond", 5)?.columns).toBe(1);
      expect(service.tile("dots", 6)?.columns).toBe(1);
      expect(service.tile("lines", 6)?.columns).toBe(1);
    });

    it("builds tiles the enumeration itself finds, so a named tile is a real member of the unit space", () => {
      for (const rows of SWEPT_ROWS) {
        for (const subFamily of NAMED_SUB_FAMILIES) {
          const built = service.tile(subFamily, rows);

          if (!built) {
            continue;
          }

          const enumerated: string[] = [];

          for (const tile of mosaicTilesService.enumerate(
            rows,
            built.columns,
          )) {
            enumerated.push(mosaicSymmetryService.canonicalIdentifier(tile));
          }

          expect(enumerated).toContain(
            mosaicSymmetryService.canonicalIdentifier(built),
          );
        }
      }
    });
  });

  describe("over the enumerated unit space", () => {
    it("names a tile exactly when every one of its marks is the same kind, and leaves every other tile unnamed", () => {
      for (const rows of SWEPT_ROWS) {
        for (
          let columns = 1;
          columns <= MOSAIC_TILE_MAXIMUM_COLUMNS;
          columns += 1
        ) {
          for (const tile of mosaicTilesService.enumerate(rows, columns)) {
            const kinds = new Set(tile.pieces.map((piece) => piece.kind));

            expect(service.classify(tile) === undefined).toBe(kinds.size > 1);
          }
        }
      }
    });

    it("counts every named region of the space, leaving the rest unnamed", () => {
      const counts = new Map<string, number>();

      for (const rows of SWEPT_ROWS) {
        for (
          let columns = 1;
          columns <= MOSAIC_TILE_MAXIMUM_COLUMNS;
          columns += 1
        ) {
          for (const tile of mosaicTilesService.enumerate(rows, columns)) {
            const name = service.classify(tile) ?? "unnamed";

            counts.set(name, (counts.get(name) ?? 0) + 1);
          }
        }
      }

      expect(Object.fromEntries(counts)).toStrictEqual({
        dashes: 75,
        diamond: 4,
        dots: 10,
        lines: 5,
        unnamed: 3085,
      });
    });
  });
});
