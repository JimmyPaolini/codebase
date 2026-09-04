import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";

import { DrawCombinationsService } from "./draw-combinations.service";
import { DrawIndexService } from "./draw-index.service";
import { DrawParametersService } from "./draw-parameters.service";
import { DrawPermutationsService } from "./draw-permutations.service";
import { DrawCommand } from "./draw.command";

/**
 * Registers the `draw` CLI command — the application's only command — the
 * service enumerating the space its sweep covers, the service rendering its
 * mosaic permutations, the service rendering the index page all of them are
 * looked through, and the service that turns its options into generation
 * parameters.
 *
 * `DrawCombinationsService` is exported because the meander charter's
 * property test sweeps the same enumeration, so the corpus written here and
 * the corpus gated there cannot drift apart.
 */
@Module({
  controllers: [],
  exports: [DrawCombinationsService, DrawCommand],
  imports: [MeanderGenerationModule],
  providers: [
    DrawCombinationsService,
    DrawCommand,
    DrawIndexService,
    DrawParametersService,
    DrawPermutationsService,
  ],
})
export class DrawModule {}
