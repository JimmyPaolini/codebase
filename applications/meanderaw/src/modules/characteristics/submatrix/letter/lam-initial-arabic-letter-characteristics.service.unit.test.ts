import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LamInitialArabicLetterCharacteristicsService } from "./lam-initial-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ل (initial Arabic lam) as a Code holding one
 * isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 *  │
 *  │
 * ╶┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x04y400c00c00a10",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "05x02y6331080000",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "03x04y2500c00c0080",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "05x02y0004023390",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "03x04y0400c00c0290",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "05x02y40000a3310",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "03x04y610c00c00800",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "05x02y2335000080",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(LamInitialArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    LamInitialArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `lamInitial${name}ArabicCount`),
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
