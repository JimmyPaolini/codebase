import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  MOSAIC_TILE_MAXIMUM_COLUMNS,
  SUPPORTED_SUB_FAMILIES,
} from "./mosaic-motif.constants";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicSubFamily } from "./mosaic-motif.types";

// 🔧 Configuration

/**
 * The row counts every claim below is checked against, rather than a sample
 * of them. Two rows deeper than `DrawPermutationsService.rowsSweep` writes,
 * which stops at `MOSAIC_TILE_MAXIMUM_ROWS`: what a sub-family's tile is at
 * a given row count is a property of the rule rather than of the corpus, so
 * checking past the sweep's own ceiling is worth more than matching it.
 */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/**
 * How long the assertion that walks the deeper end of the space is given.
 *
 * Eight rows at two columns is 2 ** 26 edge assignments to walk before the
 * matching filter cuts them to 11,275, which is real work rather than a hang
 * — so it is declared rather than left to the default five seconds, the same
 * way the charter measurement declares its own. It passes locally in about
 * five and fails on a slower runner, which is exactly the kind of flake a
 * declared timeout exists to prevent.
 */
const SPACE_WALK_TIMEOUT_MILLISECONDS = 60_000;

/** Every named sub-family, typed rather than widened for the command line. */
const NAMED_SUB_FAMILIES: readonly MosaicSubFamily[] = [
  "dashes",
  "diamond",
  "dots",
  "lines",
];

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
        MosaicTileService,
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

  describe("tile", () => {
    it("can build every sub-family the command line offers, and offers every one it can build", () => {
      expect([...SUPPORTED_SUB_FAMILIES].toSorted()).toStrictEqual(
        [...NAMED_SUB_FAMILIES].toSorted(),
      );
    });

    it("has no diamond tile where the interior has an odd number of levels, since southward edges cover levels in pairs", () => {
      expect(service.tile("diamond", 6)).toBeUndefined();
      expect(service.tile("diamond", 8)).toBeUndefined();
      expect(service.tile("diamond", 5)).toBeDefined();
      expect(service.tile("diamond", 7)).toBeDefined();
    });

    it("has no tile at all where the bar has no interior level to mark", () => {
      expect(service.tile("dots", 1)).toBeUndefined();
    });

    it("spans two columns for dashes, whose edge reaches into the column beside it, and one for the rest", () => {
      expect(service.tile("dashes", 6)?.columns).toBe(2);
      expect(service.tile("diamond", 5)?.columns).toBe(1);
      expect(service.tile("dots", 6)?.columns).toBe(1);
      expect(service.tile("lines", 6)?.columns).toBe(1);
    });

    it("anchors every edge in the tile's first column, which is the representative the region is named after", () => {
      const dashes = service.tile("dashes", 4);

      expect(dashes && mosaicSymmetryService.identify(dashes)).toBe(
        "1010100000",
      );
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
    }, SPACE_WALK_TIMEOUT_MILLISECONDS);

    it("never builds a tile wider than the sweep's own column cap", () => {
      for (const subFamily of NAMED_SUB_FAMILIES) {
        expect(service.tile(subFamily, 6)?.columns ?? 1).toBeLessThanOrEqual(
          MOSAIC_TILE_MAXIMUM_COLUMNS,
        );
      }
    });
  });
});
