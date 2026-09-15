import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";

import { MosaicConnectivityService } from "./mosaic-connectivity.service";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicBuildableSubFamily, MosaicTile } from "./mosaic-tile.types";

// 🔧 Configuration

/**
 * Every shape the edge budget admits, which is the same list
 * `mosaic-tiles.service.unit.test.ts` sweeps. Written out here too rather
 * than shared, because the counts asserted below are counts *over this list*
 * — a list that grew or shrank would move them, and a shared constant would
 * move both tests silently instead of failing one.
 */
const ADMITTED_SHAPES: readonly {
  readonly columns: number;
  readonly rows: number;
}[] = [
  { columns: 1, rows: 3 },
  { columns: 2, rows: 3 },
  { columns: 3, rows: 3 },
  { columns: 4, rows: 3 },
  { columns: 5, rows: 3 },
  { columns: 1, rows: 4 },
  { columns: 2, rows: 4 },
  { columns: 3, rows: 4 },
  { columns: 1, rows: 5 },
  { columns: 2, rows: 5 },
  { columns: 1, rows: 6 },
];

/**
 * Five minutes for the four cases that walk the space, where this project
 * declares a minute for everything else.
 *
 * Whichever of them runs first pays for the whole walk — the other three
 * filter the list it memoized — and on a CI runner this file measures 42–56
 * seconds in total. That put the paying case within ordinary variance of the
 * minute, and 🧑‍🔬 Test Coverage timed out on it once. The walk is
 * `2 ** edges` wide at eleven shapes and takes seconds locally, so the
 * figure is a saturated runner rather than a hang;
 * `draw-check.command.integration.test.ts` carries the same number and the
 * measurements behind it.
 */
const WALK_TIMEOUT_MILLISECONDS = 300_000;

// 🧪 Tests

describe(MosaicConnectivityService, () => {
  let service: MosaicConnectivityService;
  let mosaicSubFamilyService: MosaicSubFamilyService;
  let mosaicTilesService: MosaicTilesService;
  let everyTile: MosaicTile[] | undefined;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicConnectivityService,
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTileService,
        MosaicTilesService,
      ],
    }).compile();

    service = await module.resolve(MosaicConnectivityService);
    mosaicSubFamilyService = await module.resolve(MosaicSubFamilyService);
    mosaicTilesService = await module.resolve(MosaicTilesService);
  });

  /**
   * Every tile the budget admits, walked once and kept.
   *
   * Enumerated on first use rather than in `beforeAll`, because the walk is
   * `2 ** edges` wide at eleven shapes and a hook has a timeout of its own.
   * Under a loaded runner the hook version of this timed out where the tests
   * themselves had thirty seconds to spare. `vitest.config.ts` has raised
   * `hookTimeout` to match `testTimeout` since #745, so the hook is no longer
   * the shorter of the two — but a test can declare its own timeout where a
   * hook cannot, which is what {@link WALK_TIMEOUT_MILLISECONDS} does.
   */
  const enumerateEverything = (): MosaicTile[] => {
    everyTile ??= ADMITTED_SHAPES.flatMap(({ columns, rows }) =>
      mosaicTilesService.enumerate(rows, columns),
    );

    return everyTile;
  };

  /**
   * The tile a sub-family names at `rows`, refusing rather than narrowing a
   * row count the sub-family names no tile at. Every call below asks for one
   * that exists, so the throw is a bad test rather than a case to handle.
   */
  const subFamilyTile = (
    subFamily: MosaicBuildableSubFamily,
    rows: number,
  ): MosaicTile => {
    const tile = mosaicSubFamilyService.tile(subFamily, rows);

    if (tile === undefined) {
      throw new Error(`${subFamily} names no tile at ${rows} rows`);
    }

    return tile;
  };

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the whole space the budget admits", () => {
    it(
      "holds 8,551 tiles, which this sweep neither filters nor changes",
      () => {
        expect(enumerateEverything()).toHaveLength(8551);
      },
      WALK_TIMEOUT_MILLISECONDS,
    );

    it(
      "finds 3,352 tiles whose ink carries no loop",
      () => {
        expect(
          enumerateEverything().filter((tile) => service.isAcyclic(tile)),
        ).toHaveLength(3352);
      },
      WALK_TIMEOUT_MILLISECONDS,
    );

    it(
      "finds 1,947 tiles whose ink is a single connected figure",
      () => {
        expect(
          enumerateEverything().filter((tile) => service.isOneComponent(tile)),
        ).toHaveLength(1947);
      },
      WALK_TIMEOUT_MILLISECONDS,
    );

    it(
      "finds 370 tiles that are both at once, which is a tree",
      () => {
        expect(
          enumerateEverything().filter(
            (tile) => service.isAcyclic(tile) && service.isOneComponent(tile),
          ),
        ).toHaveLength(370);
      },
      WALK_TIMEOUT_MILLISECONDS,
    );
  });

  describe("connectivity", () => {
    it("counts every point of a tile as a node, dots included, since a bare point is inked", () => {
      const dots = subFamilyTile("dots", 5);

      expect(service.connectivity(dots)).toStrictEqual({
        components: 4,
        edges: 0,
        freeEnds: 0,
        nodes: 4,
      });
    });

    /**
     * `bars` at three rows is the smallest tree there is: two points, one
     * southward edge between them, nothing wrapping.
     */
    it("reads an unbroken bar as one loop-free piece", () => {
      const bars = subFamilyTile("bars", 3);

      expect(service.connectivity(bars)).toStrictEqual({
        components: 1,
        edges: 1,
        freeEnds: 2,
        nodes: 2,
      });
      expect(service.isAcyclic(bars)).toBe(true);
      expect(service.isOneComponent(bars)).toBe(true);
    });

    /**
     * `lines` is where the periodic reading parts company with the drawing:
     * each level's eastward edge wraps onto its own point, so the tile holds
     * one self-loop per level — a cycle in the repeat — while the rendering
     * of it is a straight rule with no loop in it at all. See
     * `mosaic-connectivity.service.integration.test.ts`.
     */
    it("reads a wrapped rule as a loop, one per level", () => {
      const lines = subFamilyTile("lines", 4);

      expect(service.connectivity(lines)).toStrictEqual({
        components: 3,
        edges: 3,
        freeEnds: 0,
        nodes: 3,
      });
      expect(service.isAcyclic(lines)).toBe(false);
      expect(service.isOneComponent(lines)).toBe(false);
    });

    it("joins the last column to the first, so a run across a tile closes on itself", () => {
      const lines = subFamilyTile("lines", 3);
      const dashes = subFamilyTile("dashes", 3);

      // `dashes` spans two columns and marks alternate ones, so its eastward
      // edge reaches the point to its right without wrapping — two nodes, one
      // edge, one piece, and no loop. `lines` marks both columns of its own
      // single-column span, which wraps.
      expect(service.isAcyclic(dashes)).toBe(true);
      expect(service.isAcyclic(lines)).toBe(false);
    });

    it("counts a point carrying one arm of ink as a free end", () => {
      const dashes = subFamilyTile("dashes", 3);
      const connectivity = service.connectivity(dashes);

      // Every point of an aligned `dashes` tile carries exactly one edge —
      // the dash it anchors or the dash reaching it from the left — so all
      // four are free ends, unlike `zigzag`'s all-corner points, which never
      // are.
      expect(connectivity.freeEnds).toBe(4);
      expect(connectivity.nodes).toBe(4);
    });
  });
});
