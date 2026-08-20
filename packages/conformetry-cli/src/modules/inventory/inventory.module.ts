import {
  ConfigurationModule,
  TemplateDiscoveryModule,
} from "@conformetry/configuration";
import { Module } from "@nestjs/common";

import { InventoryService } from "./inventory.service";

/**
 * Provides the shared template and instance inventory.
 */
@Module({
  controllers: [],
  exports: [InventoryService],
  imports: [ConfigurationModule, TemplateDiscoveryModule],
  providers: [InventoryService],
})
export class InventoryModule {}
