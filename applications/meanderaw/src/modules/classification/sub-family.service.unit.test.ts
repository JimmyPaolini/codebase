import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { buildTile } from "../../../testing/tiles";
import { TileEnumerationService } from "../enumeration/tile-enumeration.service";
import { SymmetryService } from "../symmetry/symmetry.service";
import { TileService } from "../tile/tile.service";

import { SubFamilyService } from "./sub-family.service";

import type { Tile, TileShape } from "../tile/tile.types";
import type { SubFamily } from "./sub-family.types";

// 🔧 Configuration

/**
 * How long the whole-space walks below are given.
 *
 * The budget admits 8,551 tiles and two of the assertions here visit every
 * one of them, which is real work rather than a hang — so it is declared
 * rather than left to the default five seconds, the same way the charter
 * measurement declares its own.
 */
const SPACE_WALK_TIMEOUT_MILLISECONDS = 120_000;

/**
 * Every shape the edge budget admits — the whole space, rather than a sample
 * of it. A name is a property of a tile, so the claims below are about the
 * space itself and not about what the sweep happens to commit.
 */
const ADMITTED_SHAPES: readonly TileShape[] = [3, 4, 5, 6].flatMap((rows) =>
  Array.from({ length: Math.floor(16 / (2 * rows - 3)) }, (_column, index) => ({
    columns: index + 1,
    rows,
  })),
);

/** Every name a rule can earn, typed rather than widened for the command line. */
const NAMES: readonly SubFamily[] = [
  "bars",
  "dashes",
  "diamond",
  "dots",
  "lines",
  "mesh",
  "square",
  "zigzag",
];

/** One canonical tile per name, written out by hand so a rule is checked against a shape rather than against its own builder. */
const CANONICAL_TILES: readonly (readonly [SubFamily, Tile])[] = [
  ["bars", buildTile(["s", "s", "."])],
  ["dashes", buildTile(["e.", "e.", "e."])],
  ["diamond", buildTile(["s", ".", "s", "."])],
  ["dots", buildTile([".", ".", "."])],
  ["lines", buildTile(["ee", "ee", "ee"])],
  ["mesh", buildTile(["bb", "bb", "ee"])],
  ["square", buildTile(["bs", "e."])],
  ["zigzag", buildTile(["sb", "e."])],
];

// 🧪 Tests

describe(SubFamilyService, () => {
  let service: SubFamilyService;
  let tileEnumerationService: TileEnumerationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubFamilyService,
        SymmetryService,
        TileService,
        TileEnumerationService,
      ],
    }).compile();

    service = await module.resolve(SubFamilyService);
    tileEnumerationService = await module.resolve(TileEnumerationService);
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
      expect(service.name(buildTile([".", "s", "."]))).toBeUndefined();
    });

    it("names a tile of bare points dots, since a point on no edge is an inked dot rather than nothing", () => {
      expect(service.name(buildTile([".", "."]))).toBe("dots");
    });

    it("tells an unbroken run from a broken one, which is the difference between lines and dashes", () => {
      expect(service.name(buildTile(["ee", "ee"]))).toBe("lines");
      expect(service.name(buildTile(["e.", "e."]))).toBe("dashes");
    });

    it("tells an unbroken bar from a dashed one, which is the difference between bars and diamond", () => {
      expect(service.name(buildTile(["s", "s", "."]))).toBe("bars");
      expect(service.name(buildTile(["s", ".", "s", "."]))).toBe("diamond");
    });

    it("tells a lane that steps out of the repeat from one that closes inside it, which is the difference between zigzag and square", () => {
      expect(service.name(buildTile(["sb", "e."]))).toBe("zigzag");
      expect(service.name(buildTile(["bs", "e."]))).toBe("square");
    });

    it("leaves a corner tile that steps in one lane and closes in another unnamed, rather than naming it the nearer of the two", () => {
      expect(service.name(buildTile(["sb", "e.", "bs", "e."]))).toBeUndefined();
    });

    it("names the two ends of the space, the tile with no edge and the tile with every edge", () => {
      expect(service.name(buildTile([".", "."]))).toBe("dots");
      expect(service.name(buildTile(["bb", "ee"]))).toBe("mesh");
    });

    it("names a tile the same as every re-phasing and mirror of it, since a rule reads structure rather than position", () => {
      expect(service.name(buildTile(["e.", "e.", "e."]))).toBe("dashes");
      expect(service.name(buildTile([".e", ".e", ".e"]))).toBe("dashes");
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
  });

  describe("over the enumerated unit space", () => {
    it("earns no name for a tile carrying a junction, since every rule requires the absence of the directions the others are about", () => {
      expect(service.name(buildTile(["be", ".."]))).toBeUndefined();
      expect(service.name(buildTile(["bs", ".."]))).toBeUndefined();
    });

    it(
      "never lets a tile earn two names, which would be a defect in the rule set rather than a tie",
      () => {
        const ambiguous: string[][] = [];

        for (const { columns, rows } of ADMITTED_SHAPES) {
          for (const tile of tileEnumerationService.enumerate(rows, columns)) {
            const earned = service.matching(tile);

            if (earned.length > 1) {
              ambiguous.push(earned);
            }
          }
        }

        expect(ambiguous).toStrictEqual([]);
      },
      SPACE_WALK_TIMEOUT_MILLISECONDS,
    );

    it(
      "counts every named region of the space, leaving the rest unnamed",
      () => {
        const counts = new Map<string, number>();

        for (const { columns, rows } of ADMITTED_SHAPES) {
          for (const tile of tileEnumerationService.enumerate(rows, columns)) {
            const earned = service.name(tile) ?? "unnamed";

            counts.set(earned, (counts.get(earned) ?? 0) + 1);
          }
        }

        expect(Object.fromEntries(counts)).toStrictEqual({
          bars: 11,
          dashes: 69,
          diamond: 4,
          dots: 11,
          lines: 11,
          mesh: 11,
          square: 4,
          unnamed: 8426,
          zigzag: 4,
        });
      },
      SPACE_WALK_TIMEOUT_MILLISECONDS,
    );
  });
});
