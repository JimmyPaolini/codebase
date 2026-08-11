import {
  ConfigurationModule,
  ConfigurationService,
} from "@jimmypaolini/conformetry-configuration";
import {
  GenerationModule,
  GenerationService,
} from "@jimmypaolini/conformetry-generation";
import { Module } from "@nestjs/common";

import { GenerateCommand } from "./generate.command";

/**
 * Provides the generate command implementation.
 */
@Module({
  controllers: [],
  exports: [GenerateCommand],
  imports: [ConfigurationModule, GenerationModule],
  providers: [
    {
      inject: [ConfigurationService, GenerationService],
      provide: GenerateCommand,
      useFactory: (
        configurationService: ConfigurationService,
        generationService: GenerationService,
      ): GenerateCommand => {
        return new GenerateCommand(configurationService, generationService);
      },
    },
  ],
})
export class GenerateModule {}
