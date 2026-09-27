import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { KafIsolatedArabicLetterCharacteristicsService } from "./kaf-isolated-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type { LetterOrientationFixture } from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ك (isolated Arabic kaf) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 * ╷
 * │ ╷
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x03y004040c0a390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x03y6100c000a310",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "04x03y6350c0808000",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x03y235000c00290",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "04x03y4000c040a390",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x03y6310c000a100",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "04x03y635080c00080",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x03y025000c02390",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

describe(KafIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    KafIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `kafIsolated${name}ArabicCount`),
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
