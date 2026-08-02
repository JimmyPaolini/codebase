import { Test } from "@nestjs/testing";
import _ from "lodash";
import moment from "moment-timezone";
import { beforeAll, describe, expect, it } from "vitest";

import { ProgressiveAspectService } from "./progressive-aspect.service";

describe(ProgressiveAspectService, () => {
  let service: ProgressiveAspectService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ProgressiveAspectService],
    }).compile();

    service = await module.resolve(ProgressiveAspectService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("should build a stable group key", () => {
    expect(
      service.buildAspectGroupKeyFromCategories({
        aspects: ["conjunct"],
        bodies: ["sun", "moon"],
        categories: ["Moon", "Conjunct", "Sun"],
      }),
    ).toBe("Moon-Conjunct-Sun");
  });

  it("should build a simple progressive event", () => {
    const beginning = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Forming",
      ],
      description: "Sun forming conjunct Moon",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Sun conjunct Moon",
    };
    const ending = {
      ...beginning,
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Dissolving",
      ],
      end: moment.utc("2024-03-21T13:00:00.000Z"),
    };

    const event = service.createSimpleAspectProgressiveEvent({
      aspectCategory: "Major Aspect",
      aspects: ["conjunct"],
      beginning,
      bodies: ["sun", "moon"],
      ending,
      isAspect: (value): value is "conjunct" => value === "conjunct",
      isBody: (value): value is "moon" | "sun" =>
        value === "sun" || value === "moon",
      symbolByAspect: { conjunct: "☌" },
      symbolByBody: { moon: "☾", sun: "☉" },
    });

    expect(event.categories).toContain("Major Aspect");
    expect(event.summary).toContain("☉");
    expect(event.summary).toContain("☾");
    expect(event.summary).toContain("☌");
  });

  it("should build progressive events from paired boundaries", () => {
    const forming = {
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Forming",
      ],
      description: "Sun forming conjunct Moon",
      end: moment.utc("2024-03-21T12:00:00.000Z"),
      start: moment.utc("2024-03-21T12:00:00.000Z"),
      summary: "Sun conjunct Moon",
    };
    const dissolving = {
      ...forming,
      categories: [
        "Astronomy",
        "Astrology",
        "Simple Aspect",
        "Major Aspect",
        "Sun",
        "Moon",
        "Conjunct",
        "Dissolving",
      ],
      end: moment.utc("2024-03-21T13:00:00.000Z"),
    };

    const events = service.buildProgressiveAspectEvents({
      aspectCategory: "Major Aspect",
      categoryLabel: "major aspect",
      events: [forming, dissolving],
      getAspectGroupKey: (event) =>
        service.buildAspectGroupKeyFromCategories({
          aspects: ["conjunct"],
          bodies: ["sun", "moon"],
          categories: event.categories,
        }),
      getProgressiveEvent: (beginning, ending) =>
        service.createSimpleAspectProgressiveEvent({
          aspectCategory: "Major Aspect",
          aspects: ["conjunct"],
          beginning,
          bodies: ["sun", "moon"],
          ending,
          isAspect: (value): value is "conjunct" => value === "conjunct",
          isBody: (value): value is "moon" | "sun" =>
            value === "sun" || value === "moon",
          symbolByAspect: { conjunct: "☌" },
          symbolByBody: { moon: "☾", sun: "☉" },
        }),
      pairProgressiveEvents: (beginnings, endings) => {
        const pairs = _.zip(beginnings, endings).filter(
          (
            pair,
          ): pair is [(typeof beginnings)[number], (typeof endings)[number]] =>
            pair[0] !== undefined && pair[1] !== undefined,
        );
        return pairs;
      },
    });

    expect(events).toHaveLength(1);
  });
});
