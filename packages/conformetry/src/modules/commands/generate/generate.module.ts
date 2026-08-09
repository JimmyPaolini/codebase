import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { GenerationModule } from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { GenerateCommand } from "./generate.command";

/**
 * Provides the generate command implementation.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, GenerationModule],
  providers: [GenerateCommand],
})
export class GenerateModule {}
