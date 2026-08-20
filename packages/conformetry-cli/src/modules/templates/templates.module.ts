import {
  ConfigurationModule,
  InputModule,
  InstanceDiscoveryModule,
} from "@conformetry/configuration";
import { InventoryModule } from "@conformetry/core";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { TemplatesCommand } from "./templates.command";

/**
 * Provides the templates command.
 */
@Module({
  controllers: [],
  exports: [TemplatesCommand],
  imports: [
    ConfigurationModule,
    InputModule,
    InstanceDiscoveryModule,
    InventoryModule,
    LoggerModule,
  ],
  providers: [TemplatesCommand],
})
export class TemplatesModule {}
