import { AnchorsModule } from "@codependix/cli";
import { Module } from "@nestjs/common";

import { ExportDeliveryModule } from "../export-delivery/export-delivery.module";

import { AnchorPlacementService } from "./anchor-placement.service";

/** Provides the Markdown-mode and auto-created-section examples. */
@Module({
  controllers: [],
  exports: [AnchorPlacementService],
  imports: [AnchorsModule, ExportDeliveryModule],
  providers: [AnchorPlacementService],
})
export class AnchorPlacementModule {}
