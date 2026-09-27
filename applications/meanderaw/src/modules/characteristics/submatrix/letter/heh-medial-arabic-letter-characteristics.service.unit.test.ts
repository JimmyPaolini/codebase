import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { HehMedialArabicLetterCharacteristicsService } from "./heh-medial-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ه (medial Arabic heh) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ┌┐
 * ╶┼┼╴
 *  └┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x03y065002ff100a900",
    names: [
      "Southeast",
      "SoutheastHalf",
      "Southwest",
      "SouthwestHalf",
      "Northeast",
      "NortheastHalf",
      "Northwest",
      "NorthwestHalf",
    ],
  },
  {
    fixture: "04x04y04006f50af900800",
    names: [
      "SoutheastQuarter",
      "SoutheastThreeQuarter",
      "SouthwestQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NortheastThreeQuarter",
      "NorthwestQuarter",
      "NorthwestThreeQuarter",
    ],
  },
];

describe(HehMedialArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    HehMedialArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `hehMedial${name}ArabicCount`),
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
