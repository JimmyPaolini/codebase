import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { YehIsolatedArabicLetterCharacteristicsService } from "./yeh-isolated-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ى (isolated Arabic alef maksura, the dotless
 * yeh) as a Code holding one isolated copy, beside every orientation name
 * drawing that ink. The base, facing Southwest, draws:
 *
 * ```text
 *   ┌╴
 * ╷ └┐
 * └──┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x03y2500069040a3390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x04y6540ca90c000a100",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "05x03y633508069000a10",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x04y025000c065c08a90",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "05x03y0061040a50a3390",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x04y6100c000c650a980",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "05x03y63350a508029000",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x04y4650a9c000c00290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ي (yeh)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(YehIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    YehIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `yehIsolated${name}ArabicCount`),
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
