import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { KafFinalArabicLetterCharacteristicsService } from "./kaf-final-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ك (final Arabic kaf) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┴╴
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x03y00040040c02b390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x04y4000e100c000a310",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "05x03y63710c080080000",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x04y235000c002d00080",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "05x03y40000c0400a3b10",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x04y6310c000e1008000",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "05x03y27350080c000080",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x04y004002d000c02390",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(KafFinalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    KafFinalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `kafFinal${name}ArabicCount`),
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
});
