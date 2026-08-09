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
  providers: [ConfigurationService, TemplateValidationService],
})
export class ConfigurationModule {}
