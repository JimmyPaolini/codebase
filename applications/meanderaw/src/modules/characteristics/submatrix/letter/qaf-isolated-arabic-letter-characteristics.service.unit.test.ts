import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { QafIsolatedArabicLetterCharacteristicsService } from "./qaf-isolated-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ٯ (isolated Arabic dotless qaf) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 *   ┌┐
 * ╷ ├┘
 * └─┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x03y65000ad0400a390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x04y06506b90c000a100",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "05x03y6350080e5000a90",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x04y025000c06790a900",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "05x03y0065040e90a3900",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x04y6100c000a7500a90",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "05x03y063506d080a9000",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x04y6500ab5000c00290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ق (qaf)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(QafIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    QafIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `qafIsolated${name}ArabicCount`),
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
