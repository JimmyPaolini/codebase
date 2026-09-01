import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";

import { StartCombinationsService } from "./start-combinations.service";
import { StartContactSheetService } from "./start-contact-sheet.service";
import { StartPermutationsService } from "./start-permutations.service";
import { StartCommand } from "./start.command";

/**
 * Registers the `start` CLI command, the service enumerating the space it
 * sweeps, and the two services it writes its mosaic permutations through.
 *
 * `StartCombinationsService` is exported because the meander charter's
 * property test sweeps the same enumeration, so the corpus written here and
 * the corpus gated there cannot drift apart.
 */
@Module({
  controllers: [],
  exports: [StartCombinationsService, StartCommand],
  imports: [MeanderGenerationModule],
  providers: [
    StartCombinationsService,
    StartCommand,
    StartContactSheetService,
    StartPermutationsService,
  ],
})
export class StartModule {}
