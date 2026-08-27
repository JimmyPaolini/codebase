import { Module } from "@nestjs/common";

import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";

import { BoxesMotifService } from "./boxes-motif.service";
import { ChainMotifService } from "./chain-motif.service";
import { MeanderGenerationService } from "./meander-generation.service";
import { MosaicMotifService } from "./mosaic-motif.service";
import { MosaicSymmetryService } from "./mosaic-symmetry.service";
import { MosaicTileGenerationService } from "./mosaic-tile-generation.service";
import { MosaicTileMotifService } from "./mosaic-tile-motif.service";
import { MosaicTilesService } from "./mosaic-tiles.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { OutputFilenameService } from "./output-filename.service";
import { SnakeMotifService } from "./snake-motif.service";
import { SnakeSequenceService } from "./snake-sequence.service";
import { SvgRenderingService } from "./svg-rendering.service";
import { SwirlMotifService } from "./swirl-motif.service";
import { WhirlMotifService } from "./whirl-motif.service";

/**
 * Wires up the services that turn generation parameters (type, rows, repeat
 * count) into a finished SVG document.
 */
@Module({
  controllers: [],
  exports: [
    MeanderGenerationService,
    MosaicTileGenerationService,
    MosaicSymmetryService,
    MosaicTilesService,
    OutputFilenameService,
  ],
  imports: [GridGeometryModule],
  providers: [
    MosaicMotifService,
    BoxesMotifService,
    ChainMotifService,
    MeanderGenerationService,
    MosaicTileGenerationService,
    MosaicTileMotifService,
    MosaicSymmetryService,
    MosaicTilesService,
    MotifTransformsService,
    OutputFilenameService,
    SnakeMotifService,
    SnakeSequenceService,
    SvgRenderingService,
    SwirlMotifService,
    WhirlMotifService,
  ],
})
export class MeanderGenerationModule {}
