import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MosaicMotifModule } from "../mosaic-motif/mosaic-motif.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";

import { NegativeMotifService } from "./negative-motif.service";
import { NegativeSourceService } from "./negative-source.service";
import { NegativeTileGenerationService } from "./negative-tile-generation.service";

/**
 * Wires up the `negative` motif, the one family whose ink is another
 * family's white space: the service that builds a named `mosaic` source, the
 * one that inks the corridors that source leaves, and the one that renders a
 * whole document from any source tile at all — which is what the permutation
 * half draws, since the tiles it enumerates have no name to be built from.
 *
 * It imports `MosaicMotifModule` for one thing only: `MosaicTileService`,
 * which is what a `MosaicTile` is *constructed* by now that the type carries
 * an invariant. A tile's four direction bits per point have to agree with
 * their neighbors', so assembling one as a literal is no longer possible —
 * and building a second constructor here to avoid the import would mean two
 * descriptions of what a tile is, which is the thing that invariant exists
 * to prevent.
 *
 * Nothing else crosses. This family still uses no `mosaic` motif, no tile
 * enumeration, and no tile renderer: it builds its sources from a rule, and
 * the assertions that tie those tiles to the committed permutation corpus
 * remain in a test rather than in a dependency.
 */
@Module({
  controllers: [],
  exports: [
    NegativeMotifService,
    NegativeSourceService,
    NegativeTileGenerationService,
  ],
  imports: [GridGeometryModule, MosaicMotifModule, SvgRenderingModule],
  providers: [
    NegativeMotifService,
    NegativeSourceService,
    NegativeTileGenerationService,
  ],
})
export class NegativeMotifModule {}
