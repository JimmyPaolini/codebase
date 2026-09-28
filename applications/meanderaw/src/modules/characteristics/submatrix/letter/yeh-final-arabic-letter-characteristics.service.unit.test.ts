import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { LETTER_ORIENTATION_NAMES } from "./letter.constants";
import { YehFinalArabicLetterCharacteristicsService } from "./yeh-final-arabic-letter-characteristics.service";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ى (final Arabic alef maksura, the dotless
 * yeh) as a Code holding one isolated copy, beside every orientation name
 * drawing that ink. The base, facing Southwest, draws:
 *
 * ```text
 *   ┌─╴
 * ╷ └┐
 * └──┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "06x03y2350000690400a3390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "04x05y004065c0ca90c000a100",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "06x03y63350080690000a310",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "04x05y025000c065c0ca908000",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "06x03y00631040a500a33900",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "04x05y6100c000c650a9c00080",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "06x03y0633500a5080239000",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "04x05y4000c650a9c000c00290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the final Arabic ي (yeh) and ئ (yeh with hamza above)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(YehFinalArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    YehFinalArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `yehFinal${name}ArabicCount`),
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
