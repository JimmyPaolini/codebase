import { InputModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { InventoryModule } from "../inventory/inventory.module";

import { InstancesCommand } from "./instances.command";

/**
 * Provides the instances command.
 */
@Module({
  controllers: [],
  exports: [InstancesCommand],
  imports: [InputModule, InventoryModule, LoggerModule],
  providers: [InstancesCommand],
})
export class InstancesModule {}
