import { Module } from "@nestjs/common";

import { MeanderGenerationModule } from "../meander-generation/meander-generation.module";

import { GenerateCommand } from "./generate.command";

/**
 * Registers the `generate` CLI command.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [MeanderGenerationModule],
  providers: [GenerateCommand],
})
export class GenerateModule {}
