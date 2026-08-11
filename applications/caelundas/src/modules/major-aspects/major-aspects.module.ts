import { AspectsUtilitiesModule } from "@caelundas/src/modules/aspects/aspects-utilities.module";
import { EphemerisModule } from "@caelundas/src/modules/ephemeris/ephemeris.module";
import { ProgressiveUtilitiesModule } from "@caelundas/src/modules/progressive/progressive-utilities.module";
import { Module } from "@nestjs/common";

import { MajorAspectEventService } from "./major-aspect-event.service";
import { MajorAspectProgressiveService } from "./major-aspect-progressive.service";
import { MajorAspectsService } from "./major-aspects.service";

/**
 * NestJS module for major aspect event detection.
 * Exports {@link MajorAspectsService} which detects conjunction (0°), sextile (60°),
 * square (90°), trine (120°), and opposition (180°) using an 8° orb tolerance.
 */
@Module({
  controllers: [],
  exports: [MajorAspectsService],
  imports: [
    EphemerisModule,
    AspectsUtilitiesModule,
    ProgressiveUtilitiesModule,
  ],
  providers: [
    MajorAspectEventService,
    MajorAspectProgressiveService,
    MajorAspectsService,
  ],
})
export class MajorAspectsModule {}
