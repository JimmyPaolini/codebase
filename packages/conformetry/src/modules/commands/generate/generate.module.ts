import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { RuntimeModule } from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { GenerateCommandArgumentsService } from "./generate-command-arguments.service.js";
import { GenerateCommand } from "./generate.command.js";

/**
 * Provides the generate command implementation.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, RuntimeModule],
  providers: [GenerateCommand, GenerateCommandArgumentsService],
})
export class GenerateModule {}
