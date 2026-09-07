import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MeanderLatticeService } from "../meander-lattice/meander-lattice.service";
import { MeanderTopologyService } from "../meander-topology/meander-topology.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MosaicConnectivityService } from "./mosaic-connectivity.service";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileGenerationService } from "./mosaic-tile-generation.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

import type { MosaicBuildableSubFamily, MosaicTile } from "./mosaic-tile.types";

// 🔧 Configuration

/**
 * The shapes this suite renders every tile of. Three of the eleven the budget
 * admits rather than all of them: this test draws a real SVG per tile and
 * reads it back through the lattice parser, so it is priced per tile, and the
 * claim it is making is a structural one that a shape either exhibits or does
 * not. One column, two columns, and a deeper band between them cover the
 * wrap — which is the whole of what separates the two readings.
 */
const RENDERED_SHAPES: readonly {
  readonly columns: number;
  readonly rows: number;
}[] = [
  { columns: 1, rows: 4 },
  { columns: 2, rows: 4 },
  { columns: 2, rows: 5 },
];

// 🧪 Tests

describe(`${MosaicConnectivityService.name} against rendered documents`, () => {
  let service: MosaicConnectivityService;
  let meanderTopologyService: MeanderTopologyService;
  let mosaicSubFamilyService: MosaicSubFamilyService;
  let mosaicTileGenerationService: MosaicTileGenerationService;
  let mosaicTilesService: MosaicTilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MeanderLatticeService,
        MeanderTopologyService,
        MosaicConnectivityService,
        MosaicSubFamilyService,
        MosaicSymmetryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MosaicTilesService,
        SvgRenderingService,
      ],
    }).compile();

    service = await module.resolve(MosaicConnectivityService);
    meanderTopologyService = await module.resolve(MeanderTopologyService);
    mosaicSubFamilyService = await module.resolve(MosaicSubFamilyService);
    mosaicTileGenerationService = await module.resolve(
      MosaicTileGenerationService,
    );
    mosaicTilesService = await module.resolve(MosaicTilesService);
  });

  /** Whether the drawing of a tile at `repeats` repeats carries no loop, measured the way any other committed document is. */
  const isDocumentAcyclic = (tile: MosaicTile, repeats: number): boolean =>
    meanderTopologyService.isAcyclic(
      meanderTopologyService.connectivity(
        mosaicTileGenerationService.generate(tile, repeats),
      ),
    );

  /** The tile a sub-family names at `rows`, refusing a row count it names none at. */
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

  /**
   * The load-bearing half of the equivalence between the two readings.
   *
   * A drawing of `N` repeats is this service's periodic band unrolled `N`
   * times, so every loop the drawing carries closes inside some run of
   * repeats — and a run of repeats maps onto the band, carrying that loop with
   * it. A tile the periodic reading calls loop-free therefore cannot render
   * to a drawing with a loop in it, at any repeat count. Nothing here is
   * sampled: every tile of three shapes, at two repeat counts.
   */
  describe("a tile with no loop renders to a drawing with no loop", () => {
    it.each([3, 6])("holds at %i repeats, with no exception", (repeats) => {
      const counterexamples = RENDERED_SHAPES.flatMap(({ columns, rows }) =>
        mosaicTilesService
          .enumerate(rows, columns)
          .filter(
            (tile) =>
              service.isAcyclic(tile) && !isDocumentAcyclic(tile, repeats),
          ),
      );

      expect(counterexamples).toStrictEqual([]);
    });
  });

  /**
   * The other half, which fails — in exactly one way, and that way is what
   * makes the periodic reading the tile's own rather than a drawing's.
   *
   * A cycle that closes only by wrapping east into the next repeat is a loop
   * within one repeat and no loop at all once unrolled: it becomes a run that
   * leaves at one side and never comes back. So the periodic reading calls
   * some tiles cyclic that a drawing of them shows loop-free — but only once
   * enough repeats are drawn for that run to actually leave and not immediately
   * rejoin itself. At one or two repeats a wrapping run can still close within
   * the drawn width by coincidence, so the gap set is smaller there (1,631 at
   * one repeat, 1,039 at two, over these three shapes) than it settles to once
   * the drawing is wide enough to show the run for what it is — which is
   * asserted here by taking it at two repeat counts past that point and
   * comparing them.
   */
  describe("a wrapping loop is a loop in the repeat and a straight run in the drawing", () => {
    it("names the same tiles once enough repeats are drawn", () => {
      const gap = (repeats: number): string[] =>
        RENDERED_SHAPES.flatMap(({ columns, rows }) =>
          mosaicTilesService
            .enumerate(rows, columns)
            .filter(
              (tile) =>
                !service.isAcyclic(tile) && isDocumentAcyclic(tile, repeats),
            )
            .map((tile) => `${rows}x${columns} ${JSON.stringify(tile.points)}`),
        );

      expect(gap(3)).toStrictEqual(gap(6));
      expect(gap(3).length).toBeGreaterThan(0);
    });

    /**
     * `lines` is the smallest case and the clearest: at one column every
     * level's eastward edge leaves its own point and arrives back at it from
     * the west, so the repeat holds one self-loop per level and the drawing
     * is three straight rules.
     */
    it("reads lines as looped in the repeat and loop-free in the drawing", () => {
      const lines = subFamilyTile("lines", 4);

      expect(service.connectivity(lines)).toStrictEqual({
        components: 3,
        edges: 3,
        freeEnds: 0,
        nodes: 3,
      });
      expect(service.isAcyclic(lines)).toBe(false);
      expect(isDocumentAcyclic(lines, 6)).toBe(true);
    });
  });

  /**
   * Why the component count has to be the tile's rather than the drawing's.
   *
   * A drawing of `bars` is one vertical stroke per repeat plus the band's two
   * cap-tick rules, so its component count is `repeats + 2` and says how many
   * repeats were drawn as much as it says anything about the tile. The tile's
   * own count is one, at every repeat count, because there is one stroke per
   * repeat.
   */
  describe("the drawing's component count moves with the repeat count and the tile's does not", () => {
    it.each([3, 6, 9])(
      "draws %i bars plus two cap ticks from a tile of one piece",
      (repeats) => {
        const bars = subFamilyTile("bars", 4);
        const document = meanderTopologyService.connectivity(
          mosaicTileGenerationService.generate(bars, repeats),
        );

        expect(service.connectivity(bars).components).toBe(1);
        expect(document.components).toBe(repeats + 2);
        expect(document.nodes).toBe(5 * repeats);
        expect(document.edges).toBe(4 * repeats - 2);
      },
    );
  });
});
