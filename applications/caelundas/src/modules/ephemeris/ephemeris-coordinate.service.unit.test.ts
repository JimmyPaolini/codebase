import { MathService } from "@caelundas/src/modules/math/math.service";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import moment from "moment-timezone";
import { calc, nod_aps_ut } from "sweph";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { EphemerisConstantsService } from "./ephemeris-constants.service";
import { EphemerisCoordinateService } from "./ephemeris-coordinate.service";
import { EphemerisTimeService } from "./ephemeris-time.service";

import type * as Sweph from "sweph";

vi.mock("sweph", async (importOriginal) => {
  const original = await importOriginal<typeof Sweph>();
  return {
    ...original,
    calc: vi.fn<typeof calc>().mockReturnValue({
      data: [120.5, -1.2, 1.01, 0, 0, 0],
      error: "",
      flag: 258,
    }),
    nod_aps_ut: vi.fn<typeof nod_aps_ut>().mockReturnValue({
      data: {
        perihelion: [90, 0, 0, 0, 0, 0],
      } as never,
      error: "",
      flag: 258,
    }),
  };
});

describe(EphemerisCoordinateService, () => {
  let service: EphemerisCoordinateService;
  let constantsService: ReturnType<
    typeof createMock<EphemerisConstantsService>
  >;
  let timeService: ReturnType<typeof createMock<EphemerisTimeService>>;
  let mathService: ReturnType<typeof createMock<MathService>>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        EphemerisCoordinateService,
        {
          provide: EphemerisConstantsService,
          useValue: createMock<EphemerisConstantsService>(),
        },
        {
          provide: EphemerisTimeService,
          useValue: createMock<EphemerisTimeService>(),
        },
        {
          provide: MathService,
          useValue: createMock<MathService>(),
        },
      ],
    }).compile();

    service = await module.resolve(EphemerisCoordinateService);
    constantsService = await module.resolve(EphemerisConstantsService);
    timeService = await module.resolve(EphemerisTimeService);
    mathService = await module.resolve(MathService);

    vi.mocked(
      constantsService.getSwissEphemerisConstantForBody,
    ).mockReturnValue(0);
    vi.mocked(timeService.dateToJulianDays).mockReturnValue({
      julianDayEphemerisTime: 2_460_395.5,
      julianDayUniversalTime: 2_460_395.499_306,
    });
    vi.mocked(timeService.generateMinutes).mockImplementation(
      (start: moment.Moment, end: moment.Moment) => {
        const values: moment.Moment[] = [];
        let current = start.clone();
        while (current.valueOf() <= end.valueOf()) {
          values.push(current.clone());
          current = current.clone().add(1, "minute");
        }
        return values;
      },
    );
    vi.mocked(mathService.normalizeDegrees).mockImplementation(
      (degree: number) => degree,
    );
  });

  describe("computeBodyCoordinate", () => {
    it("returns longitude and latitude from calc", () => {
      const result = service.computeBodyCoordinate("sun", 2_460_395.5);

      expect(result).toStrictEqual({ latitude: -1.2, longitude: 120.5 });
    });
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("computeDistanceForBody", () => {
    it("returns distance ephemeris by minute", () => {
      const result = service.computeDistanceForBody({
        body: "sun",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(Object.keys(result)).toHaveLength(2);

      for (const value of Object.values(result)) {
        expect(value.distance).toBe(1.01);
      }
    });
  });

  describe("computeNodeBodyMinutes", () => {
    it("returns node coordinates for each minute", () => {
      const result = service.computeNodeBodyMinutes({
        body: "north lunar node",
        end: moment.utc("2024-03-21T00:01:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(Object.keys(result)).toHaveLength(2);

      for (const value of Object.values(result)) {
        expect(value.latitude).toBe(0);
      }
    });

    it("returns lunar perigee coordinates for each minute", () => {
      const result = service.computeNodeBodyMinutes({
        body: "lunar perigee",
        end: moment.utc("2024-03-21T00:00:00.000Z"),
        start: moment.utc("2024-03-21T00:00:00.000Z"),
      });

      expect(Object.keys(result)).toHaveLength(1);
      expect(Object.values(result)[0]).toStrictEqual({
        latitude: 0,
        longitude: 90,
      });
    });
  });

  describe("error handling", () => {
    it("throws when calc fails for a body", () => {
      vi.mocked(calc).mockReturnValueOnce({
        data: [0, 0, 0, 0, 0, 0],
        error: "calc failed",
        flag: -1,
      } as never);

      expect(() => service.computeBodyCoordinate("sun", 2_460_395.5)).toThrow(
        "calc failed for sun: calc failed",
      );
    });

    it("throws when lunar perigee calculation fails", () => {
      vi.mocked(nod_aps_ut).mockReturnValueOnce({
        data: {
          perihelion: [0, 0, 0, 0, 0, 0],
        },
        error: "nod_aps_ut failed",
        flag: -1,
      } as never);

      expect(() =>
        service.computeNodeBodyMinutes({
          body: "lunar perigee",
          end: moment.utc("2024-03-21T00:00:00.000Z"),
          start: moment.utc("2024-03-21T00:00:00.000Z"),
        }),
      ).toThrow("nod_aps_ut failed for lunar perigee: nod_aps_ut failed");
    });
  });
});
