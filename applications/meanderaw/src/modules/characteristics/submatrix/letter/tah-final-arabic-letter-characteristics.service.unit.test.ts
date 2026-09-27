import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { TahFinalArabicLetterCharacteristicsService } from "./tah-final-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ط (final Arabic tah) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * ├┐
 * └┴╴
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y004006d02b90",
    names: [
      "Southeast",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestHalf",
    ],
  },
  {
    fixture: "04x03y4000e500ab10",
    names: [
      "SoutheastQuarter",
      "Southwest",
      "NortheastHalf",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x03y6710e9008000",
    names: [
      "SoutheastHalf",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "Northwest",
    ],
  },
  {
    fixture: "04x03y27500ad00080",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestHalf",
      "Northeast",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the final Arabic ظ (zah)",
    names: [
      "SoutheastQuarter",
      "Southwest",
      "NortheastHalf",
      "NorthwestThreeQuarter",
    ],
  },
];

describe(TahFinalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    TahFinalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `tahFinal${name}ArabicCount`),
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
