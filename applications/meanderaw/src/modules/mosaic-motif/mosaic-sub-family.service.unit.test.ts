import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";

import {
  MOSAIC_TILE_MAXIMUM_COLUMNS,
  SUPPORTED_SUB_FAMILIES,
} from "./mosaic-motif.constants";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicSubFamily, MosaicTile } from "./mosaic-motif.types";

// 🔧 Configuration

/**
 * The row counts every classification claim below is checked against, rather
 * than a sample of them.
 *
 * Two rows deeper than `DrawPermutationsService.rowsSweep` writes, which
 * stops at `MOSAIC_TILE_MAXIMUM_ROWS`. Classification is a property of a
 * tile rather than of the corpus — `MosaicSubFamilyService.classify` reads a
 * tile's direction bits and knows nothing about what was committed — so
 * checking the space past the sweep's own ceiling is worth more here than
 * matching it, and these are the counts README.md's sub-family table
 * publishes.
 */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/** Every named sub-family, typed rather than widened for the command line. */
const NAMED_SUB_FAMILIES: readonly MosaicSubFamily[] = [
  "dashes",
  "diamond",
  "dots",
  "lines",
];

/** One canonical tile per sub-family, written out by hand so the predicate is checked against a shape rather than against its own builder. */
const CANONICAL_TILES: readonly (readonly [MosaicSubFamily, MosaicTile])[] = [
  ["dashes", mosaicTile(["e.", "e.", "e."])],
  ["diamond", mosaicTile(["s", ".", "s", "."])],
  ["dots", mosaicTile([".", ".", "."])],
  ["lines", mosaicTile(["e", "e", "e"])],
];

/** How a point is reached, which is what a sub-family is a tile's worth of agreement about. */
const reach = (tile: MosaicTile): Set<string> =>
  new Set(
    tile.points.flatMap((row) =>
      row.map((point) => {
        if (!point.east && !point.north && !point.south && !point.west) {
          return "bare";
        }

        return point.east || point.west ? "horizontal" : "vertical";
      }),
    ),
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

  describe("classify", () => {
    it.each(CANONICAL_TILES)(
      "names a tile whose every point is reached the same way %s",
      (subFamily, tile) => {
        expect(service.classify(tile)).toBe(subFamily);
      },
    );

    it("leaves a tile that mixes them unnamed rather than naming it the nearest one", () => {
      expect(service.classify(mosaicTile([".", "s", "."]))).toBeUndefined();
    });

    it("names a tile of bare points dots, since a point on no edge is an inked dot rather than nothing", () => {
      expect(service.classify(mosaicTile([".", "."]))).toBe("dots");
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
    it("names a tile exactly when every one of its points is reached the same way, and leaves every other tile unnamed", () => {
      for (const rows of SWEPT_ROWS) {
        for (
          let columns = 1;
          columns <= MOSAIC_TILE_MAXIMUM_COLUMNS;
          columns += 1
        ) {
          for (const tile of mosaicTilesService.enumerate(rows, columns)) {
            expect(service.classify(tile) === undefined).toBe(
              reach(tile).size > 1,
            );
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
