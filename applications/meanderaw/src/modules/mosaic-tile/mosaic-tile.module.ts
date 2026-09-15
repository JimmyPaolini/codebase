import { Module } from "@nestjs/common";

import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

/**
 * Wires up the tile enumeration and nothing else — the tile vocabulary every
 * other service reads a tile through, symmetry canonicalization, and the
 * subset enumeration over a tile's edges.
 *
 * It imports nothing. The sub-family predicates, the per-tile motif, the
 * reading of a tile's ink as a graph, and the standalone generator that
 * rendered one enumerated tile to a document are all gone: each was reached
 * only from its own tests once the per-family procedural pipeline retired,
 * and carrying dead code is how a codebase stops describing what it does.
 * The drawing and graph modules they leaned on are no longer imported here
 * as a result, which leaves this module a leaf.
 */
@Module({
  controllers: [],
  exports: [MosaicSymmetryService, MosaicTileService, MosaicTilesService],
  imports: [],
  providers: [MosaicSymmetryService, MosaicTileService, MosaicTilesService],
})
export class MosaicTileModule {}
