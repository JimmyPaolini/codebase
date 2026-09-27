import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LamIsolatedArabicLetterCharacteristicsService } from "./lam-isolated-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ل (isolated Arabic lam) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *   ╷
 *   │
 * ╷ │
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x04y4000c000c040a390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "05x03y63310c0000a1000",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "04x04y635080c000c00080",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "05x03y00250000c023390",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "04x04y004000c040c0a390",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "05x03y61000c0000a3310",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "04x04y6350c080c0008000",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "05x03y23350000c000290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(LamIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    LamIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `lamIsolated${name}ArabicCount`),
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
