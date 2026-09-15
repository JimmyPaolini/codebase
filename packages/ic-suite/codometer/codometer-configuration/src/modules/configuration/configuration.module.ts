import { Module } from "@nestjs/common";

import { ConfigurationFlagsService } from "./configuration-flags.service";
import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationService } from "./configuration.service";

/**
 * Provides the configuration layer's one public service.
 *
 * `ConfigurationLoaderService` and `ConfigurationFlagsService` are providers
 * rather than exports: they are how `ConfigurationService` reads a file and a
 * command line, and nothing outside this package injects either.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [
    ConfigurationFlagsService,
    ConfigurationLoaderService,
    ConfigurationService,
  ],
})
export class ConfigurationModule {}
