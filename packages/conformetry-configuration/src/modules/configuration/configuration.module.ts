import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service.js";
import { TemplateValidationService } from "./configuration-template-validation.service.js";

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
