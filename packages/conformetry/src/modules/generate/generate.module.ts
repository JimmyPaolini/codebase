import {
  ConfigurationModule,
  ConfigurationService,
  InputModule,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import {
  GenerationModule,
  GenerationService,
} from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service";

import { GenerateCommand } from "./generate.command";

/**
 * Provides the generate command implementation.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, GenerationModule, InputModule],
  providers: [
    {
      inject: [
        InputService,
        ConfigurationService,
        GenerationService,
        LoggerService,
      ],
      provide: GenerateCommand,
      useFactory: (
        inputService: InputService,
        configurationService: ConfigurationService,
        generationService: GenerationService,
        loggerService: LoggerService,
      ): GenerateCommand => {
        return new GenerateCommand(
          inputService,
          configurationService,
          generationService,
          loggerService,
        );
      },
    },
  ],
})
export class GenerateModule {}
