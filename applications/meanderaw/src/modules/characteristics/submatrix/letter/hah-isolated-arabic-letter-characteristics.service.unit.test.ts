import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { HahIsolatedArabicLetterCharacteristicsService } from "./hah-isolated-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ح (isolated Arabic hah) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌╴
 * ┌┘
 * └─╴
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y25000a502390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x03y4040c690a900",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "04x03y6310a5000a10",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x03y065069c08080",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "04x03y06106900a310",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x03y6500ca508080",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "04x03y235006902900",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x03y4040a5c00a90",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ج (jeem) and خ (khah)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(HahIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    HahIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `hahIsolated${name}ArabicCount`),
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
