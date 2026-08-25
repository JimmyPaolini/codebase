import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";

import { GenerateBatchCommand } from "./generate-batch.command";

/**
 * Registers the `generate-batch` CLI command.
 */
@Module({
  controllers: [],
  exports: [GenerateBatchCommand],
  imports: [MeanderGenerationModule],
  providers: [GenerateBatchCommand],
})
export class GenerateBatchModule {}
