import { AspectEphemerisService } from "@caelundas/src/modules/aspects/aspect-ephemeris.service";
import { AspectEventFormattingService } from "@caelundas/src/modules/aspects/aspect-event-formatting.service";
import { AspectsUtilitiesService } from "@caelundas/src/modules/aspects/aspects-utilities.service";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { MinorAspectsEventService } from "./minor-aspects-event.service";

describe(MinorAspectsEventService, () => {
  let service: MinorAspectsEventService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MinorAspectsEventService,
        {
          provide: AspectEphemerisService,
          useValue: createMock<AspectEphemerisService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: AspectsUtilitiesService,
          useValue: createMock<AspectsUtilitiesService>(),
        },
        {
          provide: AspectEventFormattingService,
          useValue: createMock<AspectEventFormattingService>(),
        },
      ],
    }).compile();

    service = await module.resolve(MinorAspectsEventService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
