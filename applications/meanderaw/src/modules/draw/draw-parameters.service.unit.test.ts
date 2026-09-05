import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  DEFAULT_COMB_IS_UPWARD,
  DEFAULT_RUNG_IS_LEFTWARD,
} from "../branch-motif/branch-motif.constants";

import { DrawParametersService } from "./draw-parameters.service";

import type { DrawCommandOptions } from "./draw.types";

/** The two options every drawing carries, so each case below states only what it is about. */
const baseOptions: DrawCommandOptions = {
  outputDirectory: "output",
  repeatCount: 6,
};

describe(DrawParametersService, () => {
  let service: DrawParametersService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DrawParametersService],
    }).compile();

    service = await module.resolve(DrawParametersService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("type", () => {
    it.each(["boxes", "branch", "cross", "mosaic", "negative", "parallel"])(
      "passes the %s family through unchanged",
      (type) => {
        expect(service.type(type)).toBe(type);
      },
    );

    it("names the whole domain when it refuses one, so the message is actionable", () => {
      expect(() => service.type("triangles")).toThrow(
        /Unsupported type "triangles"; supported: .*mosaic/,
      );
    });
  });

  describe("modifierName", () => {
    it.each([
      "alternated",
      "dot",
      "edge",
      "edge-flip",
      "flip",
      "plied",
      "spin",
      "spin-flip",
      "split",
    ])("passes the %s modifier through unchanged", (modifier) => {
      expect(service.modifierName(modifier)).toBe(modifier);
    });

    it("rejects an unsupported modifier name", () => {
      expect(() => service.modifierName("bogus")).toThrow(
        /Unsupported modifier "bogus"/,
      );
    });
  });

  describe("subFamily", () => {
    it.each(["dashes", "diamond", "dots", "lines"])(
      "passes the %s sub-family through unchanged",
      (subFamily) => {
        expect(service.subFamily(subFamily)).toBe(subFamily);
      },
    );

    // 🎯 `dot` is a modifier and `dots` is a sub-family: different things one
    // letter apart, and only the plural belongs here.
    it("rejects the dot modifier it sounds like", () => {
      expect(() => service.subFamily("dot")).toThrow(
        /Unsupported sub-family "dot"/,
      );
    });
  });

  describe("dotShape", () => {
    it.each(["bounce", "up"])(
      "passes the %s shape through unchanged",
      (shape) => {
        expect(service.dotShape(shape)).toBe(shape);
      },
    );

    it("rejects an unsupported shape", () => {
      expect(() => service.dotShape("sideways")).toThrow(
        /Unsupported shape "sideways"/,
      );
    });
  });

  describe("modifier", () => {
    it("is undefined where no modifier was asked for", () => {
      expect(service.modifier(baseOptions)).toBeUndefined();
    });

    it("carries a modifier that takes no parameter through as its name alone", () => {
      expect(
        service.modifier({ ...baseOptions, modifier: "spin" }),
      ).toStrictEqual({
        name: "spin",
      });
    });

    it.each([
      {
        expected: { name: "alternated", period: 2 },
        options: { modifier: "alternated" as const, period: 2 },
      },
      {
        expected: { name: "dot", shape: "bounce" },
        options: { modifier: "dot" as const, shape: "bounce" as const },
      },
      {
        expected: { name: "plied", strands: 3 },
        options: { modifier: "plied" as const, strands: 3 },
      },
      {
        expected: { isUpward: true, name: "comb" },
        options: { modifier: "comb" as const, upward: true },
      },
      {
        expected: { isLeftward: true, name: "rung" },
        options: { leftward: true, modifier: "rung" as const },
      },
      {
        expected: { branches: 4, name: "stagger" },
        options: { branches: 4, modifier: "stagger" as const },
      },
    ])(
      "recombines $expected.name with the parameter parsed beside it",
      ({ expected, options }) => {
        expect(service.modifier({ ...baseOptions, ...options })).toStrictEqual(
          expected,
        );
      },
    );

    // 🎯 Defaulting the missing parameter would draw something other than
    // what was asked for, under a filename that claims otherwise.
    it.each([
      { flag: "--period", modifier: "alternated" as const },
      { flag: "--shape", modifier: "dot" as const },
      { flag: "--strands", modifier: "plied" as const },
      { flag: "--branches", modifier: "stagger" as const },
    ])("refuses $modifier without $flag", ({ flag, modifier }) => {
      expect(() => service.modifier({ ...baseOptions, modifier })).toThrow(
        new RegExp(`Modifier "${modifier}" requires ${flag}`),
      );
    });

    // 🎯 The two modifiers carrying a parameter that are not refused
    // without it, and the reason is the parameter's type rather than a
    // softer rule: commander reports a boolean flag left off and one passed
    // `false` identically, so there is no "absent" for these to refuse.
    // Each takes the direction every committed drawing of its mode was made
    // with instead.
    it.each([
      {
        expected: { isUpward: DEFAULT_COMB_IS_UPWARD, name: "comb" },
        modifier: "comb" as const,
      },
      {
        expected: { isLeftward: DEFAULT_RUNG_IS_LEFTWARD, name: "rung" },
        modifier: "rung" as const,
      },
    ])(
      "defaults $modifier's direction rather than refusing it",
      ({ expected, modifier }) => {
        expect(service.modifier({ ...baseOptions, modifier })).toStrictEqual(
          expected,
        );
      },
    );
  });

  describe("single", () => {
    it("builds the parameters for the drawing the options name", () => {
      expect(
        service.single({ ...baseOptions, rows: 5, type: "boxes" }),
      ).toStrictEqual({ repeatCount: 6, rows: 5, type: "boxes" });
    });

    it("omits an absent modifier and sub-family rather than passing them as undefined", () => {
      expect(
        Object.keys(service.single({ ...baseOptions, rows: 5, type: "boxes" })),
      ).toStrictEqual(["repeatCount", "rows", "type"]);
    });

    it("carries the modifier it rebuilt", () => {
      expect(
        service.single({
          ...baseOptions,
          modifier: "dot",
          rows: 6,
          shape: "up",
          type: "mosaic",
        }),
      ).toStrictEqual({
        modifier: { name: "dot", shape: "up" },
        repeatCount: 6,
        rows: 6,
        type: "mosaic",
      });
    });

    it("carries the sub-family, which needs no rebuilding of its own", () => {
      expect(
        service.single({
          ...baseOptions,
          rows: 6,
          subFamily: "dots",
          type: "mosaic",
        }),
      ).toStrictEqual({
        repeatCount: 6,
        rows: 6,
        subFamily: "dots",
        type: "mosaic",
      });
    });

    // 🎯 Neither flag can be `required`, since passing neither is how the
    // whole sweep is asked for — so the pair is checked here instead.
    it.each([
      { label: "--type without --rows", options: { type: "boxes" as const } },
      { label: "--rows without --type", options: { rows: 5 } },
      { label: "neither", options: {} },
    ])("refuses $label", ({ options }) => {
      expect(() => service.single({ ...baseOptions, ...options })).toThrow(
        /needs both --type and --rows/,
      );
    });
  });
});
