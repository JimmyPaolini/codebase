import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { WawIsolatedArabicLetterCharacteristicsService } from "./waw-isolated-arabic-letter-characteristics.service";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the و (isolated Arabic waw) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ┌┐
 * └┤
 * ┌┘
 * ╵
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x04y650e90a50080",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "05x02y0675029a90",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "03x04y400a506d0a90",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "05x02y65610ab900",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "03x04y650ad0690800",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "05x02y256500ab90",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "03x04y040690e50a90",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "05x02y67500a9a10",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(WawIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    WawIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `wawIsolated${name}ArabicCount`),
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
