import { ConfigurationModule, InputModule } from "@conformetry/configuration";
import { GenerationModule } from "@conformetry/generation";
import { Module } from "@nestjs/common";

import { LoggerModule } from "../logger/logger.module";

import { GenerateCommand } from "./generate.command";

/**
 * Provides the generate command.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, GenerationModule, InputModule, LoggerModule],
  providers: [GenerateCommand],
})
export class GenerateModule {}
