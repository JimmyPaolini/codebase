import { Module } from "@nestjs/common";

import { BoxesMotifService } from "./boxes-motif.service";
import { GridGeometryService } from "./grid-geometry.service";
import { MeanderGenerationService } from "./meander-generation.service";
import { MotifTransformsService } from "./motif-transforms.service";
import { SvgRenderingService } from "./svg-rendering.service";

/**
 * Wires up the services that turn generation parameters (type, rows, repeat
 * count) into a finished SVG document.
 */
@Module({
  controllers: [],
  exports: [MeanderGenerationService],
  imports: [],
  providers: [
    BoxesMotifService,
    GridGeometryService,
    MeanderGenerationService,
    MotifTransformsService,
    SvgRenderingService,
  ],
})
export class MeanderGenerationModule {}
