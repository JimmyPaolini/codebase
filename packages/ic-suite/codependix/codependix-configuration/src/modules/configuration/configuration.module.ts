import { Module } from "@nestjs/common";

import { OverrideResolutionModule } from "../override-resolution/override-resolution.module";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationService } from "./configuration.service";

/**
 * Provides loading, validation, and per-project resolution of codependix
 * configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [OverrideResolutionModule],
  providers: [ConfigurationLoaderService, ConfigurationService],
})
export class ConfigurationModule {}
