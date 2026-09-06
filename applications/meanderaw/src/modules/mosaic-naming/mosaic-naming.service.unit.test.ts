import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { mosaicTile } from "../../../testing/mosaic-tiles";
import { MOSAIC_TILE_MAXIMUM_COLUMNS } from "../mosaic-motif/mosaic-motif.constants";
import { MosaicSubFamilyService } from "../mosaic-motif/mosaic-sub-family.service";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";

import { MosaicNamingService } from "./mosaic-naming.service";

import type {
  MosaicBuildableSubFamily,
  MosaicSubFamily,
  MosaicTile,
} from "../mosaic-motif/mosaic-motif.types";

// 🔧 Configuration

/**
 * The row counts every naming claim below is checked against, rather than a
 * sample of them.
 *
 * Two rows deeper than `DrawPermutationsService.rowsSweep` writes, which
 * stops at `MOSAIC_TILE_MAXIMUM_ROWS`. A name is a property of a tile rather
 * than of the corpus — a rule reads direction bits and knows nothing about
 * what was committed — so checking the space past the sweep's own ceiling is
 * worth more here than matching it, and these are the counts README.md's
 * sub-family table publishes.
 */
const SWEPT_ROWS: readonly number[] = [4, 5, 6, 7, 8];

/** Every name a rule can earn, typed rather than widened for the command line. */
const NAMES: readonly MosaicSubFamily[] = [
  "bars",
  "dashes",
  "diamond",
  "dots",
  "lines",
  "mesh",
  "steps",
];

/** The names that also have a builder, which is what the round trip below can go through. */
const BUILDABLE_NAMES: readonly MosaicBuildableSubFamily[] = [
  "bars",
  "dashes",
  "diamond",
  "dots",
  "lines",
];

/** One canonical tile per name, written out by hand so a rule is checked against a shape rather than against its own builder. */
const CANONICAL_TILES: readonly (readonly [MosaicSubFamily, MosaicTile])[] = [
  ["bars", mosaicTile(["s", "s", "."])],
  ["dashes", mosaicTile(["e.", "e.", "e."])],
  ["diamond", mosaicTile(["s", ".", "s", "."])],
  ["dots", mosaicTile([".", ".", "."])],
  ["lines", mosaicTile(["ee", "ee", "ee"])],
  ["mesh", mosaicTile(["bb", "bb", "ee"])],
  ["steps", mosaicTile(["sb", "e."])],
];

// 🧪 Tests

describe(MosaicNamingService, () => {
  let service: MosaicNamingService;
  let mosaicSubFamilyService: MosaicSubFamilyService;
  let mosaicTilesService: MosaicTilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MosaicNamingService,
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTileService,
        MosaicTilesService,
      ],
    }).compile();

    service = await module.resolve(MosaicNamingService);
    mosaicSubFamilyService = await module.resolve(MosaicSubFamilyService);
    mosaicTilesService = await module.resolve(MosaicTilesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("name", () => {
    it.each(CANONICAL_TILES)(
      "names a tile whose every point is reached the same way %s",
      (earned, tile) => {
        expect(service.name(tile)).toBe(earned);
      },
    );

    it("leaves a tile that mixes them unnamed rather than naming it the nearest one", () => {
      expect(service.name(mosaicTile([".", "s", "."]))).toBeUndefined();
    });

    it("names a tile of bare points dots, since a point on no edge is an inked dot rather than nothing", () => {
      expect(service.name(mosaicTile([".", "."]))).toBe("dots");
    });

    it("tells an unbroken run from a broken one, which is the difference between lines and dashes", () => {
      expect(service.name(mosaicTile(["ee", "ee"]))).toBe("lines");
      expect(service.name(mosaicTile(["e.", "e."]))).toBe("dashes");
    });

    it("tells an unbroken bar from a dashed one, which is the difference between bars and diamond", () => {
      expect(service.name(mosaicTile(["s", "s", "."]))).toBe("bars");
      expect(service.name(mosaicTile(["s", ".", "s", "."]))).toBe("diamond");
    });

    it("names the two ends of the space, the tile with no edge and the tile with every edge", () => {
      expect(service.name(mosaicTile([".", "."]))).toBe("dots");
      expect(service.name(mosaicTile(["bb", "ee"]))).toBe("mesh");
    });

    it("names a tile the same as every re-phasing and mirror of it, since a rule reads structure rather than position", () => {
      expect(service.name(mosaicTile(["e.", "e.", "e."]))).toBe("dashes");
      expect(service.name(mosaicTile([".e", ".e", ".e"]))).toBe("dashes");
    });
  });

  describe("rules", () => {
    it("earns every name a sub-family can be built for, and builds one for every name it earns", () => {
      expect(
        service
          .rules()
          .map((rule) => rule.name)
          .toSorted(),
      ).toStrictEqual([...NAMES].toSorted());
    });

    it.each(BUILDABLE_NAMES)(
      "names back every %s tile the sub-family builder constructs, at every row count it exists at",
      (earned) => {
        const built = [4, 5, 6, 7, 8, 9, 10, 11, 12]
          .map((rows) => mosaicSubFamilyService.tile(earned, rows))
          .filter((tile) => tile !== undefined);

        expect(built.length).toBeGreaterThan(0);
        expect(built.map((tile) => service.name(tile))).toStrictEqual(
          built.map(() => earned),
        );
      },
    );
  });

  describe("over the enumerated unit space", () => {
    it("never lets a tile earn two names, which would be a defect in the rule set rather than a tie", () => {
      const ambiguous: string[][] = [];

      for (const rows of SWEPT_ROWS) {
        for (
          let columns = 1;
          columns <= MOSAIC_TILE_MAXIMUM_COLUMNS;
          columns += 1
        ) {
          for (const tile of mosaicTilesService.enumerate(rows, columns)) {
            const earned = service.matching(tile);

            if (earned.length > 1) {
              ambiguous.push(earned);
            }
          }
        }
      }

      expect(ambiguous).toStrictEqual([]);
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
            const earned = service.name(tile) ?? "unnamed";

            counts.set(earned, (counts.get(earned) ?? 0) + 1);
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
