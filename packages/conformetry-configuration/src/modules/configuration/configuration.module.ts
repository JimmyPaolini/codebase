import { Module } from "@nestjs/common";

import { TemplateValidationService } from "./configuration-template-validation.service";
import { ConfigurationService } from "./configuration.service";

/**
 * Provides the configuration service.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService, TemplateValidationService],
  imports: [],
  providers: [
    ConfigurationService,
    {
      inject: [ConfigurationService],
      provide: TemplateValidationService,
      useFactory: (
        configurationService: ConfigurationService,
      ): TemplateValidationService => {
        return new TemplateValidationService(configurationService);
      },
    },
  ],
})
export class ConfigurationModule {}
