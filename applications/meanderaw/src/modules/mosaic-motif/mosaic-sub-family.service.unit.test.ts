import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SUPPORTED_SUB_FAMILIES } from "./mosaic-motif.constants";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicBuildableSubFamily } from "./mosaic-motif.types";

// 🔧 Configuration

/**
 * The row counts the aligned tiles below are checked against, which is every
 * one the sweep enumerates at. A sub-family's tile has to be a real member of
 * the space it names a region of, and the space is exactly what the edge
 * budget admits — so the assertion is bounded by the enumeration rather than
 * by a sample of it.
 */
const SWEPT_ROWS: readonly number[] = [3, 4, 5, 6];

/**
 * How long the assertion that walks every admitted shape is given.
 *
 * The edge budget admits eleven of them and the widest is 2 ** 15 edge
 * assignments, which is real work rather than a hang — so it is declared
 * rather than left to the default five seconds, the same way the charter
 * measurement declares its own.
 */
const SPACE_WALK_TIMEOUT_MILLISECONDS = 60_000;

/** Every named sub-family, typed rather than widened for the command line. */
const NAMED_SUB_FAMILIES: readonly MosaicBuildableSubFamily[] = [
  "bars",
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

    it("builds an unbroken bar where diamond builds a dashed one, which is the whole difference between the two names", () => {
      const bars = service.tile("bars", 5);
      const diamond = service.tile("diamond", 5);

      expect(bars && mosaicSymmetryService.identify(bars)).toBe("4cc8");
      expect(diamond && mosaicSymmetryService.identify(diamond)).toBe("4848");
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
      expect(service.tile("bars", 6)?.columns).toBe(1);
      expect(service.tile("dashes", 6)?.columns).toBe(2);
      expect(service.tile("diamond", 5)?.columns).toBe(1);
      expect(service.tile("dots", 6)?.columns).toBe(1);
      expect(service.tile("lines", 6)?.columns).toBe(1);
    });

    it("anchors every edge in the tile's first column, which is the representative the region is named after", () => {
      const dashes = service.tile("dashes", 4);

      expect(dashes && mosaicSymmetryService.identify(dashes)).toBe("212121");
    });

    /**
     * A named tile has to be a real member of the space, which every one of
     * them now is: nothing bounds a point any more, so the only thing that
     * can put a buildable tile outside the enumeration is a shape the edge
     * budget refuses.
     */
    it(
      "builds tiles the enumeration itself finds, so a named tile is a real member of the unit space",
      () => {
        let checked = 0;

        for (const rows of SWEPT_ROWS) {
          for (const subFamily of NAMED_SUB_FAMILIES) {
            const built = service.tile(subFamily, rows);

            if (
              !built ||
              built.columns > mosaicTilesService.maximumColumns(rows)
            ) {
              continue;
            }

            checked += 1;

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

        expect(checked).toBeGreaterThan(0);
      },
      SPACE_WALK_TIMEOUT_MILLISECONDS,
    );
  });
});
