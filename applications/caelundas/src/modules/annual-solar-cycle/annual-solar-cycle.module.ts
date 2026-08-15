import { EphemerisModule } from "@caelundas/src/modules/ephemeris/ephemeris.module";
import { MathModule } from "@caelundas/src/modules/math/math.module";
import { ProgressiveUtilitiesModule } from "@caelundas/src/modules/progressive/progressive-utilities.module";
import { Module } from "@nestjs/common";

import { AnnualSolarCycleEventsService } from "./annual-solar-cycle-events.service";
import { AnnualSolarCycleService } from "./annual-solar-cycle.service";

/**
 * NestJS module for annual solar cycle event detection.
 * Exports {@link AnnualSolarCycleService} which identifies solstices, equinoxes,
 * cross-quarter days, hexadecans, and solar apsis (perihelion/aphelion).
 */
@Module({
  controllers: [],
  exports: [AnnualSolarCycleService],
  imports: [EphemerisModule, MathModule, ProgressiveUtilitiesModule],
  providers: [AnnualSolarCycleEventsService, AnnualSolarCycleService],
})
export class AnnualSolarCycleModule {}
