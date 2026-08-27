import { Module } from "@nestjs/common";

import { BoxesMotifModule } from "../boxes-motif/boxes-motif.module";
import { ChainMotifModule } from "../chain-motif/chain-motif.module";
import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MosaicMotifModule } from "../mosaic-motif/mosaic-motif.module";
import { SnakeMotifModule } from "../snake-motif/snake-motif.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";
import { SwirlMotifModule } from "../swirl-motif/swirl-motif.module";
import { WhirlMotifModule } from "../whirl-motif/whirl-motif.module";

import { MeanderGenerationService } from "./meander-generation.service";

/**
 * Wires up the dispatcher that turns generation parameters (type, rows,
 * repeat count) into a finished SVG document, by importing one module per
 * motif and selecting between them on `type`.
 *
 * Re-exports what the command modules resolve — the mosaic tile services
 * among them — so `generate` and `start` depend on this one module rather
 * than reaching past it into each motif's own.
 */
@Module({
  controllers: [],
  exports: [MeanderGenerationService, MosaicMotifModule, SvgRenderingModule],
  imports: [
    BoxesMotifModule,
    ChainMotifModule,
    GridGeometryModule,
    MosaicMotifModule,
    SnakeMotifModule,
    SvgRenderingModule,
    SwirlMotifModule,
    WhirlMotifModule,
  ],
  providers: [MeanderGenerationService],
})
export class MeanderGenerationModule {}
