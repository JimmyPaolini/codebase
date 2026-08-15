import { AspectsUtilitiesModule } from "@caelundas/src/modules/aspects/aspects-utilities.module";
import { EphemerisModule } from "@caelundas/src/modules/ephemeris/ephemeris.module";
import { ProgressiveUtilitiesModule } from "@caelundas/src/modules/progressive/progressive-utilities.module";
import { Module } from "@nestjs/common";

import { MinorAspectsEventService } from "./minor-aspects-event.service";
import { MinorAspectsProgressiveService } from "./minor-aspects-progressive.service";
import { MinorAspectsService } from "./minor-aspects.service";

/**
 * NestJS module for minor aspect event detection.
 * Exports {@link MinorAspectsService} which detects semi-sextile (30°), semi-square (45°),
 * sesquiquadrate (135°), and quincunx (150°) with narrower orbs than major aspects.
 */
@Module({
  controllers: [],
  exports: [MinorAspectsService],
  imports: [
    EphemerisModule,
    AspectsUtilitiesModule,
    ProgressiveUtilitiesModule,
  ],
  providers: [
    MinorAspectsEventService,
    MinorAspectsProgressiveService,
    MinorAspectsService,
  ],
})
export class MinorAspectsModule {}
