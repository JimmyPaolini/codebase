import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { SubmatrixUtilitiesService } from "../submatrix-utilities.service";

import { ALatinLetterCharacteristicsService } from "./a-latin-letter-characteristics.service";
import { AinFinalArabicLetterCharacteristicsService } from "./ain-final-arabic-letter-characteristics.service";
import { AinInitialArabicLetterCharacteristicsService } from "./ain-initial-arabic-letter-characteristics.service";
import { AinIsolatedArabicLetterCharacteristicsService } from "./ain-isolated-arabic-letter-characteristics.service";
import { AinMedialArabicLetterCharacteristicsService } from "./ain-medial-arabic-letter-characteristics.service";
import { AlefFinalArabicLetterCharacteristicsService } from "./alef-final-arabic-letter-characteristics.service";
import { AoHanziLetterCharacteristicsService } from "./ao-hanzi-letter-characteristics.service";
import { BLatinLetterCharacteristicsService } from "./b-latin-letter-characteristics.service";
import { BehFinalArabicLetterCharacteristicsService } from "./beh-final-arabic-letter-characteristics.service";
import { BehInitialArabicLetterCharacteristicsService } from "./beh-initial-arabic-letter-characteristics.service";
import { BehIsolatedArabicLetterCharacteristicsService } from "./beh-isolated-arabic-letter-characteristics.service";
import { BehMedialArabicLetterCharacteristicsService } from "./beh-medial-arabic-letter-characteristics.service";
import { CLatinLetterCharacteristicsService } from "./c-latin-letter-characteristics.service";
import { DalFinalArabicLetterCharacteristicsService } from "./dal-final-arabic-letter-characteristics.service";
import { DalIsolatedArabicLetterCharacteristicsService } from "./dal-isolated-arabic-letter-characteristics.service";
import { DaletHebrewLetterCharacteristicsService } from "./dalet-hebrew-letter-characteristics.service";
import { DeltaGreekLetterCharacteristicsService } from "./delta-greek-letter-characteristics.service";
import { ELatinLetterCharacteristicsService } from "./e-latin-letter-characteristics.service";
import { FLatinLetterCharacteristicsService } from "./f-latin-letter-characteristics.service";
import { FehFinalArabicLetterCharacteristicsService } from "./feh-final-arabic-letter-characteristics.service";
import { FehInitialArabicLetterCharacteristicsService } from "./feh-initial-arabic-letter-characteristics.service";
import { FehIsolatedArabicLetterCharacteristicsService } from "./feh-isolated-arabic-letter-characteristics.service";
import { FehMedialArabicLetterCharacteristicsService } from "./feh-medial-arabic-letter-characteristics.service";
import { GanHanziLetterCharacteristicsService } from "./gan-hanzi-letter-characteristics.service";
import { HLatinLetterCharacteristicsService } from "./h-latin-letter-characteristics.service";
import { HahFinalArabicLetterCharacteristicsService } from "./hah-final-arabic-letter-characteristics.service";
import { HahInitialArabicLetterCharacteristicsService } from "./hah-initial-arabic-letter-characteristics.service";
import { HahIsolatedArabicLetterCharacteristicsService } from "./hah-isolated-arabic-letter-characteristics.service";
import { HahMedialArabicLetterCharacteristicsService } from "./hah-medial-arabic-letter-characteristics.service";
import { HehFinalArabicLetterCharacteristicsService } from "./heh-final-arabic-letter-characteristics.service";
import { HehInitialArabicLetterCharacteristicsService } from "./heh-initial-arabic-letter-characteristics.service";
import { HehMedialArabicLetterCharacteristicsService } from "./heh-medial-arabic-letter-characteristics.service";
import { ILatinLetterCharacteristicsService } from "./i-latin-letter-characteristics.service";
import { JiaHanziLetterCharacteristicsService } from "./jia-hanzi-letter-characteristics.service";
import { JingHanziLetterCharacteristicsService } from "./jing-hanzi-letter-characteristics.service";
import { KafFinalArabicLetterCharacteristicsService } from "./kaf-final-arabic-letter-characteristics.service";
import { KafInitialArabicLetterCharacteristicsService } from "./kaf-initial-arabic-letter-characteristics.service";
import { KafIsolatedArabicLetterCharacteristicsService } from "./kaf-isolated-arabic-letter-characteristics.service";
import { KafMedialArabicLetterCharacteristicsService } from "./kaf-medial-arabic-letter-characteristics.service";
import { KappaGreekLetterCharacteristicsService } from "./kappa-greek-letter-characteristics.service";
import { KieukHangulLetterCharacteristicsService } from "./kieuk-hangul-letter-characteristics.service";
import { LLatinLetterCharacteristicsService } from "./l-latin-letter-characteristics.service";
import { LamFinalArabicLetterCharacteristicsService } from "./lam-final-arabic-letter-characteristics.service";
import { LamInitialArabicLetterCharacteristicsService } from "./lam-initial-arabic-letter-characteristics.service";
import { LamIsolatedArabicLetterCharacteristicsService } from "./lam-isolated-arabic-letter-characteristics.service";
import { LamMedialArabicLetterCharacteristicsService } from "./lam-medial-arabic-letter-characteristics.service";
import { LambdaGreekLetterCharacteristicsService } from "./lambda-greek-letter-characteristics.service";
import { LamedHebrewLetterCharacteristicsService } from "./lamed-hebrew-letter-characteristics.service";
import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { LetterUtilitiesService } from "./letter-utilities.service";
import { LETTER_SCRIPTS } from "./letter.constants";
import { MLatinLetterCharacteristicsService } from "./m-latin-letter-characteristics.service";
import { MeemFinalArabicLetterCharacteristicsService } from "./meem-final-arabic-letter-characteristics.service";
import { MeemInitialArabicLetterCharacteristicsService } from "./meem-initial-arabic-letter-characteristics.service";
import { MeemMedialArabicLetterCharacteristicsService } from "./meem-medial-arabic-letter-characteristics.service";
import { MuHanziLetterCharacteristicsService } from "./mu-hanzi-letter-characteristics.service";
import { NLatinLetterCharacteristicsService } from "./n-latin-letter-characteristics.service";
import { NoonFinalArabicLetterCharacteristicsService } from "./noon-final-arabic-letter-characteristics.service";
import { NoonIsolatedArabicLetterCharacteristicsService } from "./noon-isolated-arabic-letter-characteristics.service";
import { OLatinLetterCharacteristicsService } from "./o-latin-letter-characteristics.service";
import { OmegaGreekLetterCharacteristicsService } from "./omega-greek-letter-characteristics.service";
import { PhiGreekLetterCharacteristicsService } from "./phi-greek-letter-characteristics.service";
import { PieupHangulLetterCharacteristicsService } from "./pieup-hangul-letter-characteristics.service";
import { PsiGreekLetterCharacteristicsService } from "./psi-greek-letter-characteristics.service";
import { QafFinalArabicLetterCharacteristicsService } from "./qaf-final-arabic-letter-characteristics.service";
import { QafIsolatedArabicLetterCharacteristicsService } from "./qaf-isolated-arabic-letter-characteristics.service";
import { RehFinalArabicLetterCharacteristicsService } from "./reh-final-arabic-letter-characteristics.service";
import { RehIsolatedArabicLetterCharacteristicsService } from "./reh-isolated-arabic-letter-characteristics.service";
import { RhoGreekLetterCharacteristicsService } from "./rho-greek-letter-characteristics.service";
import { SLatinLetterCharacteristicsService } from "./s-latin-letter-characteristics.service";
import { SadFinalArabicLetterCharacteristicsService } from "./sad-final-arabic-letter-characteristics.service";
import { SadInitialArabicLetterCharacteristicsService } from "./sad-initial-arabic-letter-characteristics.service";
import { SadIsolatedArabicLetterCharacteristicsService } from "./sad-isolated-arabic-letter-characteristics.service";
import { SadMedialArabicLetterCharacteristicsService } from "./sad-medial-arabic-letter-characteristics.service";
import { SeenFinalArabicLetterCharacteristicsService } from "./seen-final-arabic-letter-characteristics.service";
import { SeenInitialArabicLetterCharacteristicsService } from "./seen-initial-arabic-letter-characteristics.service";
import { SeenIsolatedArabicLetterCharacteristicsService } from "./seen-isolated-arabic-letter-characteristics.service";
import { SeenMedialArabicLetterCharacteristicsService } from "./seen-medial-arabic-letter-characteristics.service";
import { ShangHanziLetterCharacteristicsService } from "./shang-hanzi-letter-characteristics.service";
import { ShenHanziLetterCharacteristicsService } from "./shen-hanzi-letter-characteristics.service";
import { SigmaGreekLetterCharacteristicsService } from "./sigma-greek-letter-characteristics.service";
import { TLatinLetterCharacteristicsService } from "./t-latin-letter-characteristics.service";
import { TahFinalArabicLetterCharacteristicsService } from "./tah-final-arabic-letter-characteristics.service";
import { TahInitialArabicLetterCharacteristicsService } from "./tah-initial-arabic-letter-characteristics.service";
import { TahIsolatedArabicLetterCharacteristicsService } from "./tah-isolated-arabic-letter-characteristics.service";
import { TahMedialArabicLetterCharacteristicsService } from "./tah-medial-arabic-letter-characteristics.service";
import { TavHebrewLetterCharacteristicsService } from "./tav-hebrew-letter-characteristics.service";
import { TianHanziLetterCharacteristicsService } from "./tian-hanzi-letter-characteristics.service";
import { TuHanziLetterCharacteristicsService } from "./tu-hanzi-letter-characteristics.service";
import { TuSoilHanziLetterCharacteristicsService } from "./tu-soil-hanzi-letter-characteristics.service";
import { ULatinLetterCharacteristicsService } from "./u-latin-letter-characteristics.service";
import { WLatinLetterCharacteristicsService } from "./w-latin-letter-characteristics.service";
import { WangHanziLetterCharacteristicsService } from "./wang-hanzi-letter-characteristics.service";
import { WawFinalArabicLetterCharacteristicsService } from "./waw-final-arabic-letter-characteristics.service";
import { WawIsolatedArabicLetterCharacteristicsService } from "./waw-isolated-arabic-letter-characteristics.service";
import { XLatinLetterCharacteristicsService } from "./x-latin-letter-characteristics.service";
import { YLatinLetterCharacteristicsService } from "./y-latin-letter-characteristics.service";
import { YaHangulLetterCharacteristicsService } from "./ya-hangul-letter-characteristics.service";
import { YehFinalArabicLetterCharacteristicsService } from "./yeh-final-arabic-letter-characteristics.service";
import { YehIsolatedArabicLetterCharacteristicsService } from "./yeh-isolated-arabic-letter-characteristics.service";
import { YeoHangulLetterCharacteristicsService } from "./yeo-hangul-letter-characteristics.service";
import { YoHangulLetterCharacteristicsService } from "./yo-hangul-letter-characteristics.service";
import { YouHanziLetterCharacteristicsService } from "./you-hanzi-letter-characteristics.service";
import { YuHangulLetterCharacteristicsService } from "./yu-hangul-letter-characteristics.service";
import { YuKatakanaLetterCharacteristicsService } from "./yu-katakana-letter-characteristics.service";
import { ZLatinLetterCharacteristicsService } from "./z-latin-letter-characteristics.service";

import type {
  CharacteristicEvaluator,
  CharacteristicEvaluatorGroup,
} from "../../characteristics.types";
import type { LetterScript } from "./letter.types";
import type { Type } from "@nestjs/common";

/** Every letter service the module provides. */
const LETTERS: readonly Type<CharacteristicEvaluatorGroup<number>>[] = [
  ALatinLetterCharacteristicsService,
  AinFinalArabicLetterCharacteristicsService,
  AinInitialArabicLetterCharacteristicsService,
  AinIsolatedArabicLetterCharacteristicsService,
  AinMedialArabicLetterCharacteristicsService,
  AlefFinalArabicLetterCharacteristicsService,
  AoHanziLetterCharacteristicsService,
  BLatinLetterCharacteristicsService,
  BehFinalArabicLetterCharacteristicsService,
  BehInitialArabicLetterCharacteristicsService,
  BehIsolatedArabicLetterCharacteristicsService,
  BehMedialArabicLetterCharacteristicsService,
  CLatinLetterCharacteristicsService,
  DalFinalArabicLetterCharacteristicsService,
  DalIsolatedArabicLetterCharacteristicsService,
  DaletHebrewLetterCharacteristicsService,
  DeltaGreekLetterCharacteristicsService,
  ELatinLetterCharacteristicsService,
  FLatinLetterCharacteristicsService,
  FehFinalArabicLetterCharacteristicsService,
  FehInitialArabicLetterCharacteristicsService,
  FehIsolatedArabicLetterCharacteristicsService,
  FehMedialArabicLetterCharacteristicsService,
  GanHanziLetterCharacteristicsService,
  HLatinLetterCharacteristicsService,
  HahFinalArabicLetterCharacteristicsService,
  HahInitialArabicLetterCharacteristicsService,
  HahIsolatedArabicLetterCharacteristicsService,
  HahMedialArabicLetterCharacteristicsService,
  HehFinalArabicLetterCharacteristicsService,
  HehInitialArabicLetterCharacteristicsService,
  HehMedialArabicLetterCharacteristicsService,
  ILatinLetterCharacteristicsService,
  JiaHanziLetterCharacteristicsService,
  JingHanziLetterCharacteristicsService,
  KafFinalArabicLetterCharacteristicsService,
  KafInitialArabicLetterCharacteristicsService,
  KafIsolatedArabicLetterCharacteristicsService,
  KafMedialArabicLetterCharacteristicsService,
  KappaGreekLetterCharacteristicsService,
  KieukHangulLetterCharacteristicsService,
  LLatinLetterCharacteristicsService,
  LamFinalArabicLetterCharacteristicsService,
  LamInitialArabicLetterCharacteristicsService,
  LamIsolatedArabicLetterCharacteristicsService,
  LamMedialArabicLetterCharacteristicsService,
  LambdaGreekLetterCharacteristicsService,
  LamedHebrewLetterCharacteristicsService,
  MLatinLetterCharacteristicsService,
  MeemFinalArabicLetterCharacteristicsService,
  MeemInitialArabicLetterCharacteristicsService,
  MeemMedialArabicLetterCharacteristicsService,
  MuHanziLetterCharacteristicsService,
  NLatinLetterCharacteristicsService,
  NoonFinalArabicLetterCharacteristicsService,
  NoonIsolatedArabicLetterCharacteristicsService,
  OLatinLetterCharacteristicsService,
  OmegaGreekLetterCharacteristicsService,
  PhiGreekLetterCharacteristicsService,
  PieupHangulLetterCharacteristicsService,
  PsiGreekLetterCharacteristicsService,
  QafFinalArabicLetterCharacteristicsService,
  QafIsolatedArabicLetterCharacteristicsService,
  RehFinalArabicLetterCharacteristicsService,
  RehIsolatedArabicLetterCharacteristicsService,
  RhoGreekLetterCharacteristicsService,
  SLatinLetterCharacteristicsService,
  SadFinalArabicLetterCharacteristicsService,
  SadInitialArabicLetterCharacteristicsService,
  SadIsolatedArabicLetterCharacteristicsService,
  SadMedialArabicLetterCharacteristicsService,
  SeenFinalArabicLetterCharacteristicsService,
  SeenInitialArabicLetterCharacteristicsService,
  SeenIsolatedArabicLetterCharacteristicsService,
  SeenMedialArabicLetterCharacteristicsService,
  ShangHanziLetterCharacteristicsService,
  ShenHanziLetterCharacteristicsService,
  SigmaGreekLetterCharacteristicsService,
  TLatinLetterCharacteristicsService,
  TahFinalArabicLetterCharacteristicsService,
  TahInitialArabicLetterCharacteristicsService,
  TahIsolatedArabicLetterCharacteristicsService,
  TahMedialArabicLetterCharacteristicsService,
  TavHebrewLetterCharacteristicsService,
  TianHanziLetterCharacteristicsService,
  TuHanziLetterCharacteristicsService,
  TuSoilHanziLetterCharacteristicsService,
  ULatinLetterCharacteristicsService,
  WLatinLetterCharacteristicsService,
  WangHanziLetterCharacteristicsService,
  WawFinalArabicLetterCharacteristicsService,
  WawIsolatedArabicLetterCharacteristicsService,
  XLatinLetterCharacteristicsService,
  YLatinLetterCharacteristicsService,
  YaHangulLetterCharacteristicsService,
  YehFinalArabicLetterCharacteristicsService,
  YehIsolatedArabicLetterCharacteristicsService,
  YeoHangulLetterCharacteristicsService,
  YoHangulLetterCharacteristicsService,
  YouHanziLetterCharacteristicsService,
  YuHangulLetterCharacteristicsService,
  YuKatakanaLetterCharacteristicsService,
  ZLatinLetterCharacteristicsService,
];

/** The token a consumer module gathers every letter service under, through a factory whose `inject` list only resolves exported providers. */
const GROUPS = Symbol("GROUPS");

/** The script a letter key names, read from its end: `daletSouthwestHebrewCount` is Hebrew. */
const SCRIPT = new RegExp(
  `(${Object.keys(LETTER_SCRIPTS).join("|")})Count$`,
  "u",
);

/** Whether a string names a letter script, so a key's script can be looked up without a cast. */
function isLetterScript(value: string | undefined): value is LetterScript {
  return value !== undefined && Object.hasOwn(LETTER_SCRIPTS, value);
}

/**
 * The glyph a letter formula typesets, with its blank border rows and columns
 * trimmed, so a template padded with blanks reads as the glyph it pads.
 */
function trimmedGlyph(formula: string): string {
  const blank = String.raw`\cdot`;
  const matrix = /\\begin\{matrix\} (.*) \\end\{matrix\}/u.exec(formula)?.[1];
  const rows = (matrix ?? "")
    .split(String.raw` \\ `)
    .map((row) => row.split(" & "));
  const inkedRows = rows.flatMap((cells, row) =>
    cells.some((cell) => cell !== blank) ? [row] : [],
  );
  const inkedColumns = rows.flatMap((cells) =>
    cells.flatMap((cell, column) => (cell === blank ? [] : [column])),
  );
  const left = Math.min(...inkedColumns);
  const right = Math.max(...inkedColumns);

  return rows
    .slice(Math.min(...inkedRows), Math.max(...inkedRows) + 1)
    .map((cells) => cells.slice(left, right + 1).join(" & "))
    .join(String.raw` \\ `);
}

describe(LetterCharacteristicsModule, () => {
  let groups: readonly CharacteristicEvaluatorGroup<number>[];
  let utilities: LetterUtilitiesService;

  /** A letter's base evaluator: its unturned orientation at its script's base corner. */
  function base(
    evaluators: readonly CharacteristicEvaluator<number>[],
  ): CharacteristicEvaluator<number> | undefined {
    return evaluators.find(({ metadata }) => {
      const script = SCRIPT.exec(metadata.key)?.[1];

      return (
        isLetterScript(script) &&
        metadata.key.endsWith(`${utilities.baseCorner(script)}${script}Count`)
      );
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LetterCharacteristicsModule],
      providers: [
        {
          inject: [...LETTERS],
          provide: GROUPS,
          useFactory: (
            ...injected: CharacteristicEvaluatorGroup<number>[]
          ): CharacteristicEvaluatorGroup<number>[] => injected,
        },
      ],
    }).compile();

    groups = module.get<CharacteristicEvaluatorGroup<number>[]>(GROUPS);
    utilities = module.get(LetterUtilitiesService);
  });

  it.each(
    LETTERS.map((service, index) => ({ index, name: service.name, service })),
  )(
    "exports $name to a consumer, with its sixteen orientation evaluators",
    ({ index, service }) => {
      expect(groups[index]).toBeInstanceOf(service);
      expect(groups[index]?.evaluators).toHaveLength(16);
    },
  );

  it("reads a template padded with blank rows and columns as the glyph it pads", () => {
    const submatrix = new SubmatrixUtilitiesService();

    expect(
      trimmedGlyph(submatrix.glyphFormula(["....", ".25.", ".29.", "...."])),
    ).toBe(trimmedGlyph(submatrix.glyphFormula(["25", "29"])));
  });

  it("finds one base orientation for every letter", () => {
    expect(
      groups.map(({ evaluators }) => base(evaluators) === undefined),
    ).toStrictEqual(groups.map(() => false));
  });

  it("gives every letter its own base shape, so no two letters share an upright glyph", () => {
    const shapes = groups.map(({ evaluators }) =>
      trimmedGlyph(base(evaluators)?.metadata.formula ?? ""),
    );

    expect(new Set(shapes).size).toBe(LETTERS.length);
  });
});
