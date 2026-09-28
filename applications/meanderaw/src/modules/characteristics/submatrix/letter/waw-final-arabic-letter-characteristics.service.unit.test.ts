import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { WawFinalArabicLetterCharacteristicsService } from "./waw-final-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the و (final Arabic waw) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┐
 * └┼╴
 * ┌┘
 * ╵
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x04y06502f900a500080",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "05x03y0040006f5029a90",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "04x04y4000a5006f10a900",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "05x03y65610af90008000",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "04x04y6500af1069008000",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "05x03y256500af9000800",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "04x04y004006902f500a90",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "05x03y040006f500a9a10",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the final Arabic ؤ (waw with hamza above)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(WawFinalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    WawFinalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `wawFinal${name}ArabicCount`),
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
