import { AnnualSolarCycleService } from "@caelundas/src/modules/annual-solar-cycle/annual-solar-cycle.service";
import { AspectsService } from "@caelundas/src/modules/aspects/aspects.service";
import { DailyCyclesService } from "@caelundas/src/modules/daily-cycles/daily-cycles.service";
import { DatetimeService } from "@caelundas/src/modules/datetime/datetime.service";
import { EclipsesService } from "@caelundas/src/modules/eclipses/eclipses.service";
import { EphemerisService } from "@caelundas/src/modules/ephemeris/ephemeris.service";
import { IngressesService } from "@caelundas/src/modules/ingresses/ingresses.service";
import { MonthlyLunarCycleService } from "@caelundas/src/modules/monthly-lunar-cycle/monthly-lunar-cycle.service";
import { PhasesService } from "@caelundas/src/modules/phases/phases.service";
import { RetrogradesService } from "@caelundas/src/modules/retrogrades/retrogrades.service";
import { TwilightsService } from "@caelundas/src/modules/twilights/twilights.service";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PerfectiveService } from "./perfective.service";

import type { Event } from "@caelundas/src/modules/calendar/calendar.types";
import type { Input } from "@caelundas/src/modules/input/input.types";
import type {
  MartianPhaseEventArguments,
  MercurianPhaseEventArguments,
  VenusianPhaseEventArguments,
} from "@caelundas/src/modules/phases/phases.types";
import type { Moment } from "moment-timezone";

vi.mock("fs", () => ({
  default: {
    writeFileSync: vi.fn<(path: string, data: string) => void>(),
  },
}));

const baseInput: Input = {
  end: moment.tz("2025-06-16", "America/New_York"),
  latitude: 39.9526,
  longitude: -75.1652,
  start: moment.tz("2025-06-15", "America/New_York"),
  timezone: "America/New_York",
};

const emptyEphemerides = {
  azimuthElevationEphemerisByBody: {} as never,
  coordinateEphemerisByBody: {} as never,
  diameterEphemerisByBody: {} as never,
  distanceEphemerisByBody: {} as never,
  illuminationEphemerisByBody: {} as never,
};

describe(PerfectiveService, () => {
  let service: PerfectiveService;

  const datetimeMock = {
    generateDates:
      vi.fn<
        (start: Moment, end: Moment, timezone: string) => Iterable<Moment>
      >(),
    generateMinutes: vi.fn<(start: Moment, end: Moment) => Iterable<Moment>>(),
  };
  const ephemerisAggMock = {
    getEphemerides: vi.fn<EphemerisService["getEphemerides"]>(),
  };
  const aspectsMock = { detect: vi.fn<AspectsService["detect"]>() };
  const eclipsesMock = { detect: vi.fn<EclipsesService["detect"]>() };
  const retrogradesMock = { detect: vi.fn<RetrogradesService["detect"]>() };
  const ingressesMock = { detect: vi.fn<IngressesService["detect"]>() };
  const dailyCyclesMock = { detect: vi.fn<DailyCyclesService["detect"]>() };
  const monthlyLunarCycleMock = {
    detect: vi.fn<MonthlyLunarCycleService["detect"]>(),
  };
  const annualSolarCycleMock = {
    detect: vi.fn<AnnualSolarCycleService["detect"]>(),
  };
  const twilightsMock = { detect: vi.fn<TwilightsService["detect"]>() };
  const phasesMock = {
    getMartianPhaseEvents: vi.fn<(args: MartianPhaseEventArguments) => Event[]>(
      () => [],
    ),
    getMercurianPhaseEvents: vi.fn<
      (args: MercurianPhaseEventArguments) => Event[]
    >(() => []),
    getVenusianPhaseEvents: vi.fn<
      (args: VenusianPhaseEventArguments) => Event[]
    >(() => []),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PerfectiveService,
        { provide: DatetimeService, useValue: datetimeMock },
        { provide: EphemerisService, useValue: ephemerisAggMock },
        { provide: AspectsService, useValue: aspectsMock },
        { provide: EclipsesService, useValue: eclipsesMock },
        { provide: RetrogradesService, useValue: retrogradesMock },
        { provide: IngressesService, useValue: ingressesMock },
        { provide: DailyCyclesService, useValue: dailyCyclesMock },
        { provide: MonthlyLunarCycleService, useValue: monthlyLunarCycleMock },
        { provide: AnnualSolarCycleService, useValue: annualSolarCycleMock },
        { provide: TwilightsService, useValue: twilightsMock },
        { provide: PhasesService, useValue: phasesMock },
      ],
    }).compile();

    service = await module.resolve(PerfectiveService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("detect", () => {
    it("returns an empty array when no dates are generated", () => {
      datetimeMock.generateDates.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toStrictEqual([]);
    });

    it("returns an empty array when no minutes are generated within a day", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toStrictEqual([]);
    });

    it("requests ephemerides with MARGIN_MINUTES padding around the day", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([]);

      service.detect(baseInput);

      expect(ephemerisAggMock.getEphemerides).toHaveBeenCalledWith(
        expect.objectContaining({
          coordinates: [-75.1652, 39.9526],
          end: moment
            .tz("2025-06-15", "America/New_York")
            .endOf("day")
            .clone()
            .add(30, "minutes"),
          start: moment
            .tz("2025-06-15", "America/New_York")
            .startOf("day")
            .clone()
            .subtract(30, "minutes"),
          timezone: "America/New_York",
        }),
      );

      const firstCallArgument =
        ephemerisAggMock.getEphemerides.mock.calls[0]?.[0];

      expect(firstCallArgument?.end.isAfter(firstCallArgument.start)).toBe(
        true,
      );
    });

    it("accumulates events returned by sub-services across all minutes", () => {
      const date = moment.tz("2025-06-15", "America/New_York");
      const minute1 = date.clone().startOf("day");
      const minute2 = date.clone().startOf("day").add(1, "minute");
      const fakeEvent1 = { summary: "event-1" } as never;
      const fakeEvent2 = { summary: "event-2" } as never;

      datetimeMock.generateDates.mockReturnValue([date]);
      ephemerisAggMock.getEphemerides.mockReturnValue(emptyEphemerides);
      datetimeMock.generateMinutes.mockReturnValue([minute1, minute2]);

      aspectsMock.detect
        .mockReturnValueOnce({ aspectBodies: [], events: [fakeEvent1] })
        .mockReturnValueOnce({ aspectBodies: [], events: [fakeEvent2] });

      for (const subMock of [
        eclipsesMock,
        retrogradesMock,
        ingressesMock,
        dailyCyclesMock,
        monthlyLunarCycleMock,
        annualSolarCycleMock,
        twilightsMock,
      ]) {
        subMock.detect.mockReturnValue([]);
      }

      phasesMock.getMartianPhaseEvents.mockReturnValue([]);
      phasesMock.getMercurianPhaseEvents.mockReturnValue([]);
      phasesMock.getVenusianPhaseEvents.mockReturnValue([]);

      const result = service.detect(baseInput);

      expect(result).toContain(fakeEvent1);
      expect(result).toContain(fakeEvent2);
    });
  });
});
