import { AnchorsModule, DeliveryModule } from "@codependix/cli";
import { Module } from "@nestjs/common";

import { ExportDeliveryService } from "./export-delivery.service";

/** Provides the export-target, run-mode, and JSON-export examples. */
@Module({
  controllers: [],
  exports: [ExportDeliveryService],
  imports: [AnchorsModule, DeliveryModule],
  providers: [ExportDeliveryService],
})
export class ExportDeliveryModule {}
