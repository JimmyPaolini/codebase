import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { StartCombinationsService } from "./start-combinations.service";

import type { GenerationParameters } from "../meander-generation/meander-generation.types";

describe(StartCombinationsService, () => {
  let service: StartCombinationsService;
  let combinations: GenerationParameters[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [StartCombinationsService],
    }).compile();

    service = await module.resolve(StartCombinationsService);
    combinations = service.enumerate();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("enumerate", () => {
    // 🎯 The size of the enumerated space, stated once. Both callers depend
    // on it: `StartCommand` writes one file per combination, and the meander
    // charter's property test asserts the charter of each. A sweep that
    // silently shrank — a renamed constant, a type guard that stopped
    // matching — would leave both quietly covering less, so it is pinned
    // here rather than inferred at either call site.
    it.each([
      // rows 3..8 × (none + alternated ×2 + dot ×2 + split)
      { expected: 36, type: "mosaic" },
      // rows 3..8 × (none + spin + spin-flip)
      { expected: 18, type: "boxes" },
      // rows 4..8 × (none + edge + flip + edge-flip)
      { expected: 20, type: "chain" },
      { expected: 20, type: "snake" },
      // rows 4..8 × (none + flip)
      { expected: 10, type: "swirl" },
      { expected: 10, type: "whirl" },
      // rows 6..8 × (none + interrupted)
      { expected: 6, type: "cross" },
      // rows 3..8 × (none + brick + ruled)
      { expected: 18, type: "negative" },
      // rows 2..8 × (none + rung + stagger)
      { expected: 21, type: "branch" },
    ])("enumerates $expected combinations for $type", ({ expected, type }) => {
      expect(
        combinations.filter((parameters) => parameters.type === type),
      ).toHaveLength(expected);
    });

    it("enumerates the whole named-type space and nothing beyond it", () => {
      expect(combinations).toHaveLength(159);
    });

    it("names every combination distinctly", () => {
      const keys = combinations.map((parameters) => JSON.stringify(parameters));

      expect(new Set(keys).size).toBe(combinations.length);
    });

    it("sweeps each type from its own structural minimum through the sweep maximum", () => {
      const mosaicRows = combinations
        .filter((parameters) => parameters.type === "mosaic")
        .map((parameters) => parameters.rows);
      const swirlRows = combinations
        .filter((parameters) => parameters.type === "swirl")
        .map((parameters) => parameters.rows);

      expect([...new Set(mosaicRows)]).toStrictEqual([3, 4, 5, 6, 7, 8]);
      expect([...new Set(swirlRows)]).toStrictEqual([4, 5, 6, 7, 8]);
    });

    it.each([
      {
        expected: { repeatCount: 6, rows: 3, type: "mosaic" },
        label: "an unmodified combination at the default repeat count",
      },
      {
        expected: {
          modifier: { name: "spin" },
          repeatCount: 8,
          rows: 3,
          type: "boxes",
        },
        label: "the spin family rounded up to a whole rotation cycle",
      },
      {
        expected: {
          modifier: { name: "alternated", period: 3 },
          repeatCount: 6,
          rows: 5,
          type: "mosaic",
        },
        label: "each representative period of a parameterized modifier",
      },
      {
        expected: {
          modifier: { name: "dot", shape: "up" },
          repeatCount: 6,
          rows: 6,
          type: "mosaic",
        },
        label: "each representative shape of a parameterized modifier",
      },
      {
        expected: {
          modifier: { name: "edge-flip" },
          repeatCount: 6,
          rows: 4,
          type: "chain",
        },
        label: "a composed modifier of a non-mosaic family",
      },
    ])("includes $label", ({ expected }) => {
      expect(combinations).toContainEqual(expected);
    });
  });
});
