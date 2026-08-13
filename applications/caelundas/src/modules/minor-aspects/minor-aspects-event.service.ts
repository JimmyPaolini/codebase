import { AspectEphemerisService } from "@caelundas/src/modules/aspects/aspect-ephemeris.service";
import { AspectEventFormattingService } from "@caelundas/src/modules/aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "@caelundas/src/modules/aspects/aspects-utilities.service";
import { minorAspects } from "@caelundas/src/modules/caelundas/caelundas.constants";
import { symbolByMinorAspect } from "@caelundas/src/modules/caelundas/symbol-caelundas.constants";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service";

import type {
  AspectPhase,
  Body,
  MinorAspect,
} from "@caelundas/src/modules/caelundas/caelundas.types";
import type { Event } from "@caelundas/src/modules/calendar/calendar.types";
import type { CoordinateEphemeris } from "@caelundas/src/modules/ephemeris/ephemeris.types";
import type { Moment } from "moment-timezone";

/**
 * Builds minor-aspect events and extracts longitude windows for detection.
 */
@Injectable()
export class MinorAspectsEventService {
  // 🏗 Dependency Injection

  constructor(
    private readonly aspectEphemerisService: AspectEphemerisService,
    private readonly logger: LoggerService,
    private readonly aspectsUtilitiesService: AspectsUtilitiesService,
    private readonly aspectEventFormattingService: AspectEventFormattingService,
  ) {
    this.logger.setContext(MinorAspectsEventService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /**
   * Creates a calendar event for a specific minor aspect occurrence.
   */
  assembleMinorAspectEvent(args: {
    body1: Body;
    body2: Body;
    minorAspect: MinorAspect;
    phase: AspectPhase;
    timestamp: Moment;
  }): Event {
    const { body1, body2, minorAspect, phase, timestamp } = args;
    return this.aspectEventFormattingService.assembleSimpleAspectEvent({
      aspectCategory: "Minor Aspect",
      aspectName: minorAspect,
      aspectSymbol: symbolByMinorAspect[minorAspect],
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
  getLongitudesWindowForBody(args: {
    body: Body;
    coordinateEphemerisByBody: Record<Body, CoordinateEphemeris>;
    minute: Moment;
    nextMinute: Moment;
    previousMinute: Moment;
  }): { current: number; next: number; previous: number } {
    return this.aspectEphemerisService.getLongitudesWindowForBody(args);
  }

  /**
   * Returns the first minor aspect between two bodies, or `null` if none is within orb.
   */
  getMinorAspect(args: {
    longitudeBody1: number;
    longitudeBody2: number;
  }): MinorAspect | null {
    const { longitudeBody1, longitudeBody2 } = args;

    return this.aspectEventFormattingService.findFirstMatchingAspect({
      aspects: minorAspects,
      isMatchingAspect: (aspect) =>
        this.aspectsUtilitiesService.isAspect({
          aspect,
          longitudeBody1,
          longitudeBody2,
        }),
    });
  }
}
