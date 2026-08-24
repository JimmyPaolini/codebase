import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service";

/**
 * Provides loading, validation, and per-project resolution of codependix
 * configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
