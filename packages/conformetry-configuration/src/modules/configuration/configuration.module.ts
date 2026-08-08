import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service.js";

/**
 * Provides the configuration service.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
