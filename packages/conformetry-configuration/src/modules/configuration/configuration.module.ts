import { Module } from "@nestjs/common";

import { ConfigurationService } from "./configuration.service";
import { InstanceGroupService } from "./instance-group.service";

/**
 * Provides loading and validation of conformetry configuration files, and the
 * reading of the instance groups they declare.
 *
 * `InstanceGroupService` is exported alongside the loader because every host
 * that resolves a group needs the same answer about it, and this module is the
 * one both already depend on.
 */
@Module({
  controllers: [],
  exports: [ConfigurationService, InstanceGroupService],
  imports: [],
  providers: [ConfigurationService, InstanceGroupService],
})
export class ConfigurationModule {}
