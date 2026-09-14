import { Module } from "@nestjs/common";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import { ConfigurationService } from "./configuration.service";

/**
 * Provides loading and validation of codometer configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [ConfigurationLoaderService, ConfigurationService],
})
export class ConfigurationModule {}
