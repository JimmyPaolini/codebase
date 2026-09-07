import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service";
import { ProjectConfigurationService } from "./project-configuration.service";

/**
 * Provides loading and validation of callidescope configuration files.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService, ProjectConfigurationService],
  imports: [],
  providers: [ConfigurationService, ProjectConfigurationService],
})
export class ConfigurationModule {}
