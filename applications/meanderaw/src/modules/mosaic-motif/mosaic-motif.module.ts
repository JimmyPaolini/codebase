import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MotifTransformsModule } from "../motif-transforms/motif-transforms.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";

import { MosaicMotifService } from "./mosaic-motif.service";
import { MosaicSubFamilyService } from "./mosaic-sub-family.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileGenerationService } from "./mosaic-tile-generation.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTilesService } from "./mosaic-tiles.service";

/**
 * Wires up the whole `mosaic` family: the motif the main generator
 * dispatches to, and the tile enumeration behind it — symmetry
 * canonicalization, the exact-cover search, the sub-family predicates that
 * name its regions, the per-tile motif, and the standalone generator that
 * renders one enumerated tile to a document.
 */
@Module({
  controllers: [],
  exports: [
    MosaicMotifService,
    MosaicSubFamilyService,
    MosaicSymmetryService,
    MosaicTileGenerationService,
    MosaicTileMotifService,
    MosaicTilesService,
  ],
  imports: [GridGeometryModule, MotifTransformsModule, SvgRenderingModule],
  providers: [
    MosaicMotifService,
    MosaicSubFamilyService,
    MosaicSymmetryService,
    MosaicTileGenerationService,
    MosaicTileMotifService,
    MosaicTilesService,
  ],
})
export class MosaicMotifModule {}
