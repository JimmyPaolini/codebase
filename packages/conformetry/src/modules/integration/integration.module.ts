import { ConfigurationModule } from "@jimmypaolini/conformetry-configuration";
import { RuntimeModule } from "@jimmypaolini/conformetry-generation";
import { ValidationModule } from "@jimmypaolini/conformetry-validation";
import { Module } from "@nestjs/common";

import { IntegrationService } from "./integration.service.js";

/**
 * Exposes integration APIs for Nx handoff into conformetry runtime services.
 */
@Module({
  controllers: [],
  exports: [IntegrationService],
  imports: [ConfigurationModule, RuntimeModule, ValidationModule],
  providers: [IntegrationService],
})
export class IntegrationModule {}
