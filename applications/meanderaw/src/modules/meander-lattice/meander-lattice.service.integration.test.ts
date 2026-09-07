import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GridGeometryService } from "../grid-geometry/grid-geometry.service";
import { MOSAIC_TILE_EDGE_BUDGET } from "../mosaic-motif/mosaic-motif.constants";
import { MosaicSymmetryService } from "../mosaic-motif/mosaic-symmetry.service";
import { MosaicTileGenerationService } from "../mosaic-motif/mosaic-tile-generation.service";
import { MosaicTileMotifService } from "../mosaic-motif/mosaic-tile-motif.service";
import { MosaicTileService } from "../mosaic-motif/mosaic-tile.service";
import { MosaicTilesService } from "../mosaic-motif/mosaic-tiles.service";
import { SvgRenderingService } from "../svg-rendering/svg-rendering.service";

import { MeanderLatticeService } from "./meander-lattice.service";

import type {
  MosaicTile,
  MosaicTileShape,
} from "../mosaic-motif/mosaic-motif.types";
import type { LatticeGraph } from "./meander-lattice.types";

// 🔧 Configuration

/**
 * How many repeat units each tile is rendered at. Three is the smallest
 * count with an interior unit — one that neither carries the leading
 * overhang nor has its cap ticks clipped — and {@link READ_UNIT} is that
 * unit.
 */
const REPEAT_COUNT = 3;

/** The repeat unit the tile is read back out of. */
const READ_UNIT = 1;

/**
 * Every shape the edge budget admits, which is the whole space this asserts
 * over rather than a sample of it — eleven shapes and 2,406 tiles, each one
 * rendered to a real document and read back.
 */
const SWEPT_SHAPES: readonly MosaicTileShape[] = [3, 4, 5, 6].flatMap((rows) =>
  Array.from(
    { length: Math.floor(MOSAIC_TILE_EDGE_BUDGET / (2 * rows - 3)) },
    (_column, index) => ({ columns: index + 1, rows }),
  ),
);

// 🧪 Tests

/**
 * The round trip that makes the tile counts trustworthy.
 *
 * `MosaicTilesService` says which tiles exist and `MosaicTileMotifService`
 * says what each one draws, and nothing so far holds the second to the
 * first: an enumeration test passes on a renderer that draws the wrong
 * thing, and a path-data test passes on a renderer that draws one tile's
 * string correctly and every other tile's wrongly.
 *
 * This closes that gap over the whole enumerated space at once. Every tile
 * the sweep commits is rendered to a real document, read back by
 * {@link MeanderLatticeService} — the same reader the charter measurement
 * uses, which knows nothing about tiles — and the lattice it produces is
 * turned back into the tile it must have come from. A rendering bug cannot
 * hide behind a passing enumeration, and a renderer and a reader that were
 * both wrong the same way would have to agree through a representation
 * neither of them shares.
 *
 * It lives here rather than in `mosaic-motif` because the lattice is the
 * thing being crossed: this module is the vocabulary the drawing side and
 * the measuring side both speak, and this is the assertion that they speak
 * it the same way.
 */
describe("mosaic tiles round-trip through the lattice", () => {
  let meanderLatticeService: MeanderLatticeService;
  let mosaicTileGenerationService: MosaicTileGenerationService;
  let mosaicTileService: MosaicTileService;
  let mosaicTilesService: MosaicTilesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GridGeometryService,
        MeanderLatticeService,
        MosaicSymmetryService,
        MosaicTileGenerationService,
        MosaicTileMotifService,
        MosaicTileService,
        MosaicTilesService,
        SvgRenderingService,
      ],
    }).compile();

    meanderLatticeService = await module.resolve(MeanderLatticeService);
    mosaicTileGenerationService = await module.resolve(
      MosaicTileGenerationService,
    );
    mosaicTileService = await module.resolve(MosaicTileService);
    mosaicTilesService = await module.resolve(MosaicTilesService);
  });

  /**
   * The tile one repeat unit of a rendered document draws.
   *
   * A tile point `(level, column)` is the lattice point at column
   * `unit × columns + column` and row `level + 1` — the `+ 1` being the top
   * cap tick, which sits on grid level `0` and is not a tile point. An
   * eastward edge is the one-pitch step right from there, a southward edge
   * the step down.
   */
  const readTile = (
    graph: LatticeGraph,
    shape: MosaicTileShape,
  ): MosaicTile => {
    const start = READ_UNIT * shape.columns;
    const edges = mosaicTileService.blankEdges(shape);

    for (const [level, row] of edges.horizontal.entries()) {
      for (const [column] of row.entries()) {
        if (graph.horizontalEdges.has(`${start + column},${level + 1}`)) {
          mosaicTileService.mark(edges.horizontal, level, column);
        }
      }
    }

    for (const [level, row] of edges.vertical.entries()) {
      for (const [column] of row.entries()) {
        if (graph.verticalEdges.has(`${start + column},${level + 1}`)) {
          mosaicTileService.mark(edges.vertical, level, column);
        }
      }
    }

    return mosaicTileService.build(shape, edges);
  };

  it.each(SWEPT_SHAPES)(
    "renders and reads back every tile at $rows rows and $columns columns as the tile enumerated",
    (shape) => {
      const tiles = mosaicTilesService.enumerate(shape.rows, shape.columns);

      expect(tiles.length).toBeGreaterThan(0);

      for (const tile of tiles) {
        const document = mosaicTileGenerationService.generate(
          tile,
          REPEAT_COUNT,
        );

        expect(
          readTile(meanderLatticeService.build(document), shape),
        ).toStrictEqual(tile);
      }
    },
  );
});
