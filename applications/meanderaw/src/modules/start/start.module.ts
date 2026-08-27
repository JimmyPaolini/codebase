import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";

import { StartContactSheetService } from "./start-contact-sheet.service";
import { StartPermutationsService } from "./start-permutations.service";
import { StartCommand } from "./start.command";

/**
 * Registers the `start` CLI command and the two services it writes its
 * mosaic permutations through.
 */
@Module({
  controllers: [],
  exports: [StartCommand],
  imports: [MeanderGenerationModule],
  providers: [StartCommand, StartContactSheetService, StartPermutationsService],
})
export class StartModule {}
