import { JsonModule, MarkdownModule } from "@codometer/output";
import { Module } from "@nestjs/common";

import { DeliveryService } from "./delivery.service";

/**
 * NestJS module that writes every resolved output a run produces.
 */
@Module({
  controllers: [],
  exports: [DeliveryService],
  imports: [JsonModule, MarkdownModule],
  providers: [DeliveryService],
})
export class DeliveryModule {}
