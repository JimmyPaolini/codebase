import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { RehIsolatedArabicLetterCharacteristicsService } from "./reh-isolated-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ر (isolated Arabic reh) as a Code holding
 * one isolated copy, beside every orientation name drawing that ink. The base,
 * facing Southwest, draws:
 *
 * ```text
 *  ╷
 * ┌┘
 * ╵
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "03x03y400a50080",
    names: ["Southeast", "SoutheastHalf", "Northwest", "NorthwestHalf"],
  },
  {
    fixture: "04x02y06102900",
    names: [
      "SoutheastQuarter",
      "SoutheastThreeQuarter",
      "NorthwestQuarter",
      "NorthwestThreeQuarter",
    ],
  },
  {
    fixture: "03x03y040690800",
    names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
  },
  {
    fixture: "04x02y25000a10",
    names: [
      "SouthwestQuarter",
      "SouthwestThreeQuarter",
      "NortheastQuarter",
      "NortheastThreeQuarter",
    ],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ز (zain)",
    names: ["Southwest", "SouthwestHalf", "Northeast", "NortheastHalf"],
  },
];

describe(RehIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    RehIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `rehIsolated${name}ArabicCount`),
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
