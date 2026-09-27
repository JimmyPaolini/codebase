import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { expectedCounts, letterHarness } from "../../../../../testing/letters";

import { FehIsolatedArabicLetterCharacteristicsService } from "./feh-isolated-arabic-letter-characteristics.service";
import { LETTER_ORIENTATION_NAMES } from "./letter.constants";

import type {
  LetterAliasFixture,
  LetterOrientationFixture,
} from "../../../../../testing/letters";

/**
 * Each distinct orientation of the ڡ (isolated Arabic dotless feh) as a Code
 * holding one isolated copy, beside every orientation name drawing that ink.
 * The base, facing Southwest, draws:
 *
 * ```text
 * ╷ ┌┐
 * └─┴┘
 * ```
 */
const ORIENTATIONS: readonly LetterOrientationFixture[] = [
  {
    fixture: "05x02y65040ab390",
    names: ["Southeast", "NorthwestHalf"],
  },
  {
    fixture: "03x04y650e90c00a10",
    names: ["SoutheastQuarter", "NorthwestThreeQuarter"],
  },
  {
    fixture: "05x02y6375080a90",
    names: ["SoutheastHalf", "Northwest"],
  },
  {
    fixture: "03x04y2500c06d0a90",
    names: ["SoutheastThreeQuarter", "NorthwestQuarter"],
  },
  {
    fixture: "05x02y40650a3b90",
    names: ["Southwest", "NortheastHalf"],
  },
  {
    fixture: "03x04y610c00e50a90",
    names: ["SouthwestQuarter", "NortheastThreeQuarter"],
  },
  {
    fixture: "05x02y67350a9080",
    names: ["SouthwestHalf", "Northeast"],
  },
  {
    fixture: "03x04y650ad00c0290",
    names: ["SouthwestThreeQuarter", "NortheastQuarter"],
  },
];

/** Each alias, beside every orientation name drawing the ink it reads as. */
const ALIASES: readonly LetterAliasFixture[] = [
  {
    alias: "the isolated Arabic ف (feh)",
    names: ["Southwest", "NortheastHalf"],
  },
];

describe(FehIsolatedArabicLetterCharacteristicsService, () => {
  const letter = letterHarness(
    FehIsolatedArabicLetterCharacteristicsService,
    async (metadata) => Test.createTestingModule(metadata).compile(),
  );

  beforeAll(async () => {
    await letter.compile();
  });

  it("keys all sixteen orientations, each marked a letter", () => {
    expect(letter.keys()).toStrictEqual(
      LETTER_ORIENTATION_NAMES.map((name) => `fehIsolated${name}ArabicCount`),
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
