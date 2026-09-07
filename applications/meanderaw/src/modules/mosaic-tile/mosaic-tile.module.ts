import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MeanderTopologyModule } from "../meander-topology/meander-topology.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";

import { MosaicConnectivityService } from "./mosaic-connectivity.service";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileGenerationService } from "./mosaic-tile-generation.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTileService } from "./mosaic-tile.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

/**
 * Wires up the whole `mosaic` family, which is its tile enumeration and
 * nothing else — the tile vocabulary every other service reads a tile
 * through, symmetry canonicalization, the subset enumeration over a tile's
 * edges, the sub-family predicates that name its regions, the per-tile
 * motif, the reading of a tile's ink as a graph, and the standalone
 * generator that renders one enumerated tile to a document.
 *
 * There is no motif for `MeanderGenerationService` to dispatch to, and that
 * absence is the family's shape rather than a gap in it: every mosaic is a
 * member of the enumerated space, so a drawing is asked for by naming a
 * member. `MotifTransformsModule` left with the motif that used it.
 *
 * {@link MeanderTopologyModule} is the one import that is not a drawing
 * concern, and the direction it runs in is the point of it.
 * {@link MosaicConnectivityService} reads a tile's ink as a graph, and the
 * walk that counts a graph's connected pieces already lives in that module,
 * counting them over a rendered document. Depending on it this way round —
 * mosaic onto topology — is what keeps the topology service free of any
 * knowledge that a `mosaic` exists, which is the stance its own module
 * documents.
 */
@Module({
  controllers: [],
  exports: [
    MosaicConnectivityService,
    MosaicSubFamilyService,
    MosaicSymmetryService,
    MosaicTileGenerationService,
    MosaicTileMotifService,
    MosaicTileService,
    MosaicTilesService,
  ],
  imports: [GridGeometryModule, MeanderTopologyModule, SvgRenderingModule],
  providers: [
    MosaicConnectivityService,
    MosaicSubFamilyService,
    MosaicSymmetryService,
    MosaicTileGenerationService,
    MosaicTileMotifService,
    MosaicTileService,
    MosaicTilesService,
  ],
})
export class MosaicTileModule {}
