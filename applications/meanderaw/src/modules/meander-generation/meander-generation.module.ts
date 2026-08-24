import { Module } from "@nestjs/common";

import { BarsMotifService } from "./bars-motif.service";
import { BoxesMotifService } from "./boxes-motif.service";
import { ChainMotifService } from "./chain-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { MeanderGenerationService } from "./meander-generation.service";
import { MotifTransformsService } from "./motif-transforms.service";
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
  exports: [MeanderGenerationService],
  imports: [],
  providers: [
    BarsMotifService,
    BoxesMotifService,
    ChainMotifService,
    GridGeometryService,
    MeanderGenerationService,
    MotifTransformsService,
    SnakeMotifService,
    SnakeSequenceService,
    SvgRenderingService,
    SwirlMotifService,
    WhirlMotifService,
  ],
})
export class MeanderGenerationModule {}
