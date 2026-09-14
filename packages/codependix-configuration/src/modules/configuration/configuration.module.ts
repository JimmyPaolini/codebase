import { Module } from "@nestjs/common";

import { OverrideResolutionModule } from "../override-resolution/override-resolution.module";

import { ConfigurationService } from "./configuration.service";

/**
 * Provides loading, validation, and per-project resolution of codependix
 * configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [OverrideResolutionModule],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
