import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { RehFinalArabicLetterCharacteristicsService } from "./reh-final-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ر (final Arabic reh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * ╵
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y25000a500080",
    names: [
      "Southeast",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestHalf",
    ],
  },
  {
    fixture: "04x03y004006902900",
    names: [
      "SoutheastQuarter",
      "SouthwestHalf",
      "Northeast",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x03y4000a5000a10",
    names: [
      "SoutheastHalf",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "Northwest",
    ],
  },
  {
    fixture: "04x03y061069008000",
    names: [
      "SoutheastThreeQuarter",
      "Southwest",
      "NortheastHalf",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the final Arabic ز (zain)",
    names: [
      "SoutheastThreeQuarter",
      "Southwest",
      "NortheastHalf",
      "NorthwestQuarter",
    ],
  },
];

describe(RehFinalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    RehFinalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `rehFinal${name}ArabicCount`),
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
