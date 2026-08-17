import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service";

/**
 * Provides loading and validation of callidescope configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService],
  imports: [],
  providers: [ConfigurationService],
})
export class ConfigurationModule {}
