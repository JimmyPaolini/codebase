import { Module } from "@nestjs/common";

import { BoxesMotifModule } from "../boxes-motif/boxes-motif.module";
import { BranchMotifModule } from "../branch-motif/branch-motif.module";
import { ChainMotifModule } from "../chain-motif/chain-motif.module";
import { CrossMotifModule } from "../cross-motif/cross-motif.module";
import { GridGeometryModule } from "../grid-geometry/grid-geometry.module";
import { MosaicMotifModule } from "../mosaic-motif/mosaic-motif.module";
import { NegativeMotifModule } from "../negative-motif/negative-motif.module";
import { ParallelMotifModule } from "../parallel-motif/parallel-motif.module";
import { SnakeMotifModule } from "../snake-motif/snake-motif.module";
import { SvgRenderingModule } from "../svg-rendering/svg-rendering.module";
import { SwirlMotifModule } from "../swirl-motif/swirl-motif.module";
import { WhirlMotifModule } from "../whirl-motif/whirl-motif.module";

import { MeanderGenerationService } from "./meander-generation.service";
import { MotifRegistryService } from "./motif-registry.service";

/**
 * Wires up the dispatcher that turns generation parameters (type, rows,
 * repeat count) into a finished SVG document, by importing one module per
 * motif and selecting between them on `type`.
 *
 * The per-family selection is {@link MotifRegistryService}'s, provided here
 * rather than exported: nothing outside this module dispatches on a family,
 * and every caller reaches the families through
 * {@link MeanderGenerationService.generate}.
 *
 * Re-exports what the command modules resolve — the tile services of the two
 * families with a permutation half among them — so `generate` and `start`
 * depend on this one module rather than reaching past it into each motif's
 * own.
 */
@Module({
  controllers: [],
  exports: [
    MeanderGenerationService,
    MosaicMotifModule,
    NegativeMotifModule,
    SvgRenderingModule,
  ],
  imports: [
    BoxesMotifModule,
    BranchMotifModule,
    ChainMotifModule,
    CrossMotifModule,
    GridGeometryModule,
    MosaicMotifModule,
    NegativeMotifModule,
    ParallelMotifModule,
    SnakeMotifModule,
    SvgRenderingModule,
    SwirlMotifModule,
    WhirlMotifModule,
  ],
  providers: [MeanderGenerationService, MotifRegistryService],
})
export class MeanderGenerationModule {}
