import { Module } from "@nestjs/common";

import { MeanderCharacteristicsService } from "./meander-characteristics.service";

/**
 * Wires up the Characteristic computation that reads a decoded Code's
 * per-point grid directly — no SVG, no filesystem, no database — which is
 * what lets `DrawCodeService` populate a row's junction counts and boolean
 * Characteristics from the same grid it already decodes to render, with
 * nothing rendered in between.
 */
@Module({
  controllers: [],
  exports: [MeanderCharacteristicsService],
  imports: [],
  providers: [MeanderCharacteristicsService],
})
export class MeanderCharacteristicsModule {}
