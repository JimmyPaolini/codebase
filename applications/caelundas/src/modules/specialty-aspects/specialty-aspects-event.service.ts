import { AspectEventFormattingService } from "@caelundas/src/modules/aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "@caelundas/src/modules/aspects/aspects-utilities.service";
import { specialtyAspects } from "@caelundas/src/modules/caelundas/caelundas.constants";
import { symbolBySpecialtyAspect } from "@caelundas/src/modules/caelundas/symbol-caelundas.constants";
import { EphemerisService } from "@caelundas/src/modules/ephemeris/ephemeris.service";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service";

import type {
  AspectPhase,
  Body,
  SpecialtyAspect,
} from "@caelundas/src/modules/caelundas/caelundas.types";
import type { Event } from "@caelundas/src/modules/calendar/calendar.types";
import type { CoordinateEphemeris } from "@caelundas/src/modules/ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Builds specialty-aspect events and extracts longitude windows for detection.
 */
@Injectable()
export class SpecialtyAspectsEventService {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly aspectsUtilitiesService: AspectsUtilitiesService,
    private readonly aspectEventFormattingService: AspectEventFormattingService,
    private readonly ephemerisService: EphemerisService,
  ) {
    this.logger.setContext(SpecialtyAspectsEventService.name);
  }

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific specialty aspect occurrence.
   */
  assembleSpecialtyAspectEvent(args: {
    body1: Body;
    body2: Body;
    phase: AspectPhase;
    specialtyAspect: SpecialtyAspect;
    timestamp: Moment;
  }): Event {
    const { body1, body2, phase, specialtyAspect, timestamp } = args;
    return this.aspectEventFormattingService.assembleSimpleAspectEvent({
      aspectCategory: "Specialty Aspect",
      aspectName: specialtyAspect,
      aspectSymbol: symbolBySpecialtyAspect[specialtyAspect],
      body1,
      body2,
      log: (message) => {
        this.logger.log(message);
      },
      phase,
      timestamp,
    });
  }

  /**
   * Returns previous/current/next longitudes for one body at minute resolution.
   */
  getBodyLongitudesWindow(args: {
    ephemeris: CoordinateEphemeris;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    const { ephemeris, minute, nextMinute, previousMinute } = args;
    return this.ephemerisService.getLongitudesWindow({
      ephemeris,
      minute,
      next: nextMinute,
      previous: previousMinute,
    });
  }

  /**
   * Returns the first specialty aspect between two bodies, or `null` if none is within orb.
   */
  getSpecialtyAspect(args: {
    longitudeBody1: number;
    longitudeBody2: number;
  }): null | SpecialtyAspect {
    const { longitudeBody1, longitudeBody2 } = args;

    return this.aspectEventFormattingService.findFirstMatchingAspect({
      aspects: specialtyAspects,
      isMatchingAspect: (aspect) =>
        this.aspectsUtilitiesService.isAspect({
          aspect,
          longitudeBody1,
          longitudeBody2,
        }),
    });
  }
}
