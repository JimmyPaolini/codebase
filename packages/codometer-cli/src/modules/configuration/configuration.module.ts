import { ConfigurationModule as CodometerConfigurationModule } from "@codometer/configuration";
import { DiscoveryModule } from "@codometer/discovery";
import { Module } from "@nestjs/common";

import { ConfigurationCommand } from "./configuration.command";
import { ConfigurationService } from "./configuration.service";
import { RenderConfigurationService } from "./render-configuration.service";

/**
 * Wires the command that lists what a repository configures.
 *
 * Imports codometer's own configuration and discovery modules rather than
 * reimplementing either: the listing must resolve a file exactly as a
 * measurement would, and must skip the same ignored directories, or it would
 * describe a repository nobody runs.
 */
@Module({
  controllers: [],
  exports: [ConfigurationCommand, ConfigurationService],
  imports: [CodometerConfigurationModule, DiscoveryModule],
  providers: [
    ConfigurationCommand,
    ConfigurationService,
    RenderConfigurationService,
  ],
})
export class ConfigurationModule {}
