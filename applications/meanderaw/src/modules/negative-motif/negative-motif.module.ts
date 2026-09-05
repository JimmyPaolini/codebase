import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
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
 * It imports no `mosaic` module. A source tile is a value rather than a
 * drawing — `MosaicTile` is a type, and the tiles here are built from a rule
 * — so nothing in this family needs the `mosaic` motif, the tile
 * enumeration, or the tile renderer at run time. The tests are where the two
 * meet, and that is deliberate: the assertions that tie these tiles to the
 * committed permutation corpus are the point of contact, and they belong in
 * a test rather than in a dependency.
 */
@Module({
  controllers: [],
  exports: [
    NegativeMotifService,
    NegativeSourceService,
    NegativeTileGenerationService,
  ],
  imports: [GridGeometryModule, SvgRenderingModule],
  providers: [
    NegativeMotifService,
    NegativeSourceService,
    NegativeTileGenerationService,
  ],
})
export class NegativeMotifModule {}
