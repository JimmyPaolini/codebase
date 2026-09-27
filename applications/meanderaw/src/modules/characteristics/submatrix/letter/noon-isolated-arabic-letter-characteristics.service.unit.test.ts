import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { NoonIsolatedArabicLetterCharacteristicsService } from "./noon-isolated-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ں (isolated Arabic dotless noon) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ╷
 * │ │
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y4040c0c0a390",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    fixture: "04x03y6310c000a310",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x03y6350c0c08080",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    fixture: "04x03y235000c02390",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ن (noon)",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
];

describe(NoonIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    NoonIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `noonIsolated${name}ArabicCount`),
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
