import { InputModule } from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { LoggerModule } from "@codebase/logger";

import { InventoryModule } from "../inventory/inventory.module";

import { TemplatesCommand } from "./templates.command";

/**
 * Provides the templates command.
 */
@Module({
  controllers: [],
  exports: [TemplatesCommand],
  imports: [InputModule, InventoryModule, LoggerModule],
  providers: [TemplatesCommand],
})
export class TemplatesModule {}
