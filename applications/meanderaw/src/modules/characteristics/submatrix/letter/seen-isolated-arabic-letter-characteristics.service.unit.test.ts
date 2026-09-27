import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { SeenIsolatedArabicLetterCharacteristicsService } from "./seen-isolated-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the س (isolated Arabic seen) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *    ╷╷╷
 * ╷ ┌┴┴┘
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "07x03y4440000abb5040000a390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x06y06100e100e106900c000a100",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "07x03y635000080a77500008880",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x06y025000c006902d002d002900",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "07x03y0004440406bb90a390000",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x06y6100c000a5000e100e100a10",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "07x03y000635067790808880000",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x06y25002d002d000a5000c00290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ش (sheen)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(SeenIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    SeenIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `seenIsolated${name}ArabicCount`),
    );
    expect(letter.marks()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map(() => true),
    );
  });

  it("draws every orientation name in exactly one fixture", () => {
    expect(ORIENTATIONS.flatMap(({ names }) => names).toSorted()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.toSorted(),
    );
  });

  it.each(ORIENTATIONS)(
    "counts $fixture once under each of $names and under no other name",
    ({ fixture, names }) => {
      expect(letter.counts(fixture)).toStrictEqual(expectedCounts(names));
    },
  );

  it.each(ORIENTATIONS)(
    "sizes the window of each of $names to the ink of $fixture",
    ({ fixture, names }) => {
      expect(letter.windows(names)).toStrictEqual(
        names.map(() => letter.inkedWindow(fixture)),
      );
    },
  );

  it.each(ALIASES)("lists $alias on exactly $names", ({ alias, names }) => {
    expect(letter.namesDescribing(alias)).toStrictEqual(names);
  });
});
