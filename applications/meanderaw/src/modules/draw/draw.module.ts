import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";
import { MosaicNamingModule } from "../mosaic-naming/mosaic-naming.module";
import { ParallelMotifModule } from "../parallel-motif/parallel-motif.module";

import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawNegativePermutationsService } from "./draw-negative-permutations.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service enumerating the space its sweep covers, the two services rendering
 * its permutation halves — one per family that has one — the service
 * rendering the index page all of them are looked through, and the service
 * that turns its options into generation parameters.
 *
 * `DrawCombinationsService` is exported because the meander charter's
 * property test sweeps the same enumeration, so the corpus written here and
 * the corpus gated there cannot drift apart.
 *
 * It imports `MosaicNamingModule` because the permutation half files each
 * tile under the name its structure earns, where it earns one — a rule read
 * off the tile rather than a label the tile carries, which is why naming is
 * a module the sweep asks rather than something the enumeration hands over.
 *
 * It imports `ParallelMotifModule` for one reason: `serpentine`'s variant
 * space is not a cross product of its axes, and which rotations and flips
 * are distinct at a given ply is a fact about the geometry rather than about
 * the sweep. Asking `ParallelSerpentineService` is what keeps the corpus
 * from carrying the same drawing under several filenames.
 */
@Module({
  controllers: [],
  exports: [DrawCombinationsService, DrawCommand],
  imports: [MeanderGenerationModule, MosaicNamingModule, ParallelMotifModule],
  providers: [
    DrawCombinationsService,
    DrawCommand,
    DrawIndexService,
    DrawNegativePermutationsService,
    DrawParametersService,
    DrawPermutationsService,
  ],
})
export class DrawModule {}
