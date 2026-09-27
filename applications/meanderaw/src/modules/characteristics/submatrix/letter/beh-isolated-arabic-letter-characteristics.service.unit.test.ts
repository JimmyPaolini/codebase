import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { BehIsolatedArabicLetterCharacteristicsService } from "./beh-isolated-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ٮ (isolated Arabic dotless beh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ╷
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "04x02y4040a390",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
  {
    fixture: "03x03y610c00a10",
    names: [
      "SoutheastQuarter",
      "SouthwestQuarter",
      "NortheastThreeQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "04x02y63508080",
    names: ["SoutheastHalf", "SouthwestHalf", "Northeast", "Northwest"],
  },
  {
    fixture: "03x03y2500c0290",
    names: [
      "SoutheastThreeQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NorthwestQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ب (beh), ت (teh), and ث (theh)",
    names: ["Southeast", "Southwest", "NortheastHalf", "NorthwestHalf"],
  },
];

describe(BehIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    BehIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `behIsolated${name}ArabicCount`),
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
