import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { AEastLetterCountCharacteristicService } from "./a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./a-west-letter-count-characteristic.service";
import { AoEastHanziCountCharacteristicService } from "./ao-east-hanzi-count-characteristic.service";
import { AoHanziCountCharacteristicService } from "./ao-hanzi-count-characteristic.service";
import { AoInvertedHanziCountCharacteristicService } from "./ao-inverted-hanzi-count-characteristic.service";
import { AoWestHanziCountCharacteristicService } from "./ao-west-hanzi-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./c-west-letter-count-characteristic.service";
import { DaletEastLetterCountCharacteristicService } from "./dalet-east-letter-count-characteristic.service";
import { DaletInvertedLetterCountCharacteristicService } from "./dalet-inverted-letter-count-characteristic.service";
import { DaletLetterCountCharacteristicService } from "./dalet-letter-count-characteristic.service";
import { DaletWestLetterCountCharacteristicService } from "./dalet-west-letter-count-characteristic.service";
import { EDownLetterCountCharacteristicService } from "./e-down-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./e-letter-count-characteristic.service";
import { EUpLetterCountCharacteristicService } from "./e-up-letter-count-characteristic.service";
import { EWestLetterCountCharacteristicService } from "./e-west-letter-count-characteristic.service";
import { FDownLetterCountCharacteristicService } from "./f-down-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./f-letter-count-characteristic.service";
import { FUpLetterCountCharacteristicService } from "./f-up-letter-count-characteristic.service";
import { FWestLetterCountCharacteristicService } from "./f-west-letter-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./h-letter-count-characteristic.service";
import { HSidewaysLetterCountCharacteristicService } from "./h-sideways-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./i-letter-count-characteristic.service";
import { ISidewaysLetterCountCharacteristicService } from "./i-sideways-letter-count-characteristic.service";
import { KieukEastHangulCountCharacteristicService } from "./kieuk-east-hangul-count-characteristic.service";
import { KieukHangulCountCharacteristicService } from "./kieuk-hangul-count-characteristic.service";
import { KieukInvertedHangulCountCharacteristicService } from "./kieuk-inverted-hangul-count-characteristic.service";
import { KieukWestHangulCountCharacteristicService } from "./kieuk-west-hangul-count-characteristic.service";
import { LDownLetterCountCharacteristicService } from "./l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./l-west-letter-count-characteristic.service";
import { LamedLetterCountCharacteristicService } from "./lamed-letter-count-characteristic.service";
import { LamedSidewaysLetterCountCharacteristicService } from "./lamed-sideways-letter-count-characteristic.service";
import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { MEastLetterCountCharacteristicService } from "./m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./m-west-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { PieupHangulCountCharacteristicService } from "./pieup-hangul-count-characteristic.service";
import { PieupSidewaysHangulCountCharacteristicService } from "./pieup-sideways-hangul-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./s-sideways-letter-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./t-west-letter-count-characteristic.service";
import { TavEastLetterCountCharacteristicService } from "./tav-east-letter-count-characteristic.service";
import { TavInvertedLetterCountCharacteristicService } from "./tav-inverted-letter-count-characteristic.service";
import { TavLetterCountCharacteristicService } from "./tav-letter-count-characteristic.service";
import { TavWestLetterCountCharacteristicService } from "./tav-west-letter-count-characteristic.service";
import { TianHanziCountCharacteristicService } from "./tian-hanzi-count-characteristic.service";
import { TuEastHanziCountCharacteristicService } from "./tu-east-hanzi-count-characteristic.service";
import { TuHanziCountCharacteristicService } from "./tu-hanzi-count-characteristic.service";
import { TuInvertedHanziCountCharacteristicService } from "./tu-inverted-hanzi-count-characteristic.service";
import { TuWestHanziCountCharacteristicService } from "./tu-west-hanzi-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { WangHanziCountCharacteristicService } from "./wang-hanzi-count-characteristic.service";
import { WangSidewaysHanziCountCharacteristicService } from "./wang-sideways-hanzi-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./y-west-letter-count-characteristic.service";
import { YuEastKatakanaCountCharacteristicService } from "./yu-east-katakana-count-characteristic.service";
import { YuInvertedKatakanaCountCharacteristicService } from "./yu-inverted-katakana-count-characteristic.service";
import { YuKatakanaCountCharacteristicService } from "./yu-katakana-count-characteristic.service";
import { YuWestKatakanaCountCharacteristicService } from "./yu-west-katakana-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./z-sideways-letter-count-characteristic.service";

import type { CharacteristicEvaluator } from "../../characteristics.types";
import type { Type } from "@nestjs/common";

/** Every letter glyph evaluator — Latin, Greek, Hebrew, and CJK — beside a Code holding one isolated copy of its glyph and nothing else. */
const LETTERS: readonly {
  readonly fixture: string;
  readonly service: Type<CharacteristicEvaluator<number>>;
}[] = [
  { fixture: "04x02y6710ab10", service: AEastLetterCountCharacteristicService },
  {
    fixture: "03x03y440ed0a90",
    service: AInvertedLetterCountCharacteristicService,
  },
  { fixture: "03x03y650ed0880", service: ALetterCountCharacteristicService },
  { fixture: "04x02y27502b90", service: AWestLetterCountCharacteristicService },
  { fixture: "03x03y650ed0a90", service: BLetterCountCharacteristicService },
  {
    fixture: "04x02y6750ab90",
    service: BSidewaysLetterCountCharacteristicService,
  },
  { fixture: "03x02y610a10", service: CLetterCountCharacteristicService },
  { fixture: "03x02y250290", service: CWestLetterCountCharacteristicService },
  { fixture: "04x02y67508880", service: EDownLetterCountCharacteristicService },
  { fixture: "03x03y610e10a10", service: ELetterCountCharacteristicService },
  { fixture: "04x02y4440ab90", service: EUpLetterCountCharacteristicService },
  {
    fixture: "03x03y2502d0290",
    service: EWestLetterCountCharacteristicService,
  },
  { fixture: "04x02y27500880", service: FDownLetterCountCharacteristicService },
  { fixture: "03x03y610e10800", service: FLetterCountCharacteristicService },
  { fixture: "04x02y4400ab10", service: FUpLetterCountCharacteristicService },
  {
    fixture: "03x03y0402d0290",
    service: FWestLetterCountCharacteristicService,
  },
  { fixture: "03x03y440ed0880", service: HLetterCountCharacteristicService },
  {
    fixture: "04x02y27102b10",
    service: HSidewaysLetterCountCharacteristicService,
  },
  { fixture: "02x02y4080", service: ILetterCountCharacteristicService },
  { fixture: "03x01y210", service: ISidewaysLetterCountCharacteristicService },
  { fixture: "03x02y610800", service: LDownLetterCountCharacteristicService },
  { fixture: "03x02y400a10", service: LLetterCountCharacteristicService },
  { fixture: "03x02y040290", service: LUpLetterCountCharacteristicService },
  { fixture: "03x02y250080", service: LWestLetterCountCharacteristicService },
  {
    fixture: "04x03y6310e100a310",
    service: MEastLetterCountCharacteristicService,
  },
  { fixture: "04x03y6750c8c08080", service: MLetterCountCharacteristicService },
  {
    fixture: "04x03y235002d02390",
    service: MWestLetterCountCharacteristicService,
  },
  { fixture: "04x03y6540ccc08a90", service: NLetterCountCharacteristicService },
  {
    fixture: "04x03y23506390a310",
    service: NSidewaysLetterCountCharacteristicService,
  },
  { fixture: "03x02y650a90", service: OLetterCountCharacteristicService },
  { fixture: "03x03y610a50290", service: SLetterCountCharacteristicService },
  {
    fixture: "04x02y4650a980",
    service: SSidewaysLetterCountCharacteristicService,
  },
  {
    fixture: "03x03y400e10800",
    service: TEastLetterCountCharacteristicService,
  },
  { fixture: "04x02y27100800", service: TLetterCountCharacteristicService },
  { fixture: "04x02y04002b10", service: TUpLetterCountCharacteristicService },
  {
    fixture: "03x03y0402d0080",
    service: TWestLetterCountCharacteristicService,
  },
  {
    fixture: "03x02y650880",
    service: UInvertedLetterCountCharacteristicService,
  },
  { fixture: "03x02y440a90", service: ULetterCountCharacteristicService },
  { fixture: "04x03y4040c4c0ab90", service: WLetterCountCharacteristicService },
  { fixture: "04x03y04002f100800", service: XLetterCountCharacteristicService },
  {
    fixture: "04x03y25000e102900",
    service: YEastLetterCountCharacteristicService,
  },
  { fixture: "04x03y4040a7900800", service: YLetterCountCharacteristicService },
  {
    fixture: "04x03y04006b508080",
    service: YUpLetterCountCharacteristicService,
  },
  {
    fixture: "04x03y06102d000a10",
    service: YWestLetterCountCharacteristicService,
  },
  { fixture: "03x03y250690a10", service: ZLetterCountCharacteristicService },
  {
    fixture: "04x02y65408a90",
    service: ZSidewaysLetterCountCharacteristicService,
  },
  { fixture: "04x02y25002b10", service: YuKatakanaCountCharacteristicService },
  {
    fixture: "03x03y440e90800",
    service: YuEastKatakanaCountCharacteristicService,
  },
  {
    fixture: "04x02y27100a10",
    service: YuInvertedKatakanaCountCharacteristicService,
  },
  {
    fixture: "03x03y0406d0880",
    service: YuWestKatakanaCountCharacteristicService,
  },
  {
    fixture: "04x03y6750efd0ab90",
    service: TianHanziCountCharacteristicService,
  },
  {
    fixture: "04x03y27102f102b10",
    service: WangHanziCountCharacteristicService,
  },
  {
    fixture: "04x03y4440efd08880",
    service: WangSidewaysHanziCountCharacteristicService,
  },
  {
    fixture: "05x03y0650069a50a3390",
    service: TuHanziCountCharacteristicService,
  },
  {
    fixture: "04x04y6500ca50c690a900",
    service: TuEastHanziCountCharacteristicService,
  },
  {
    fixture: "05x03y63350a56900a900",
    service: TuInvertedHanziCountCharacteristicService,
  },
  {
    fixture: "04x04y065069c0a5c00a90",
    service: TuWestHanziCountCharacteristicService,
  },
  {
    fixture: "05x03y65650ca9c0a3390",
    service: AoHanziCountCharacteristicService,
  },
  {
    fixture: "04x04y6350c690ca50a390",
    service: AoEastHanziCountCharacteristicService,
  },
  {
    fixture: "05x03y63350c65c0a9a90",
    service: AoInvertedHanziCountCharacteristicService,
  },
  {
    fixture: "04x04y6350a5c069c0a390",
    service: AoWestHanziCountCharacteristicService,
  },
  {
    fixture: "05x02y277102bb10",
    service: PieupHangulCountCharacteristicService,
  },
  {
    fixture: "03x04y440ed0ed0880",
    service: PieupSidewaysHangulCountCharacteristicService,
  },
  {
    fixture: "03x03y2502d0080",
    service: KieukHangulCountCharacteristicService,
  },
  {
    fixture: "04x02y04402b90",
    service: KieukEastHangulCountCharacteristicService,
  },
  {
    fixture: "03x03y400e10a10",
    service: KieukInvertedHangulCountCharacteristicService,
  },
  {
    fixture: "04x02y67108800",
    service: KieukWestHangulCountCharacteristicService,
  },
  {
    fixture: "05x02y2371000800",
    service: DaletLetterCountCharacteristicService,
  },
  {
    fixture: "03x04y0400c02d0080",
    service: DaletEastLetterCountCharacteristicService,
  },
  {
    fixture: "05x02y040002b310",
    service: DaletInvertedLetterCountCharacteristicService,
  },
  {
    fixture: "03x04y400e10c00800",
    service: DaletWestLetterCountCharacteristicService,
  },
  {
    fixture: "03x03y400a50080",
    service: LamedLetterCountCharacteristicService,
  },
  {
    fixture: "04x02y06102900",
    service: LamedSidewaysLetterCountCharacteristicService,
  },
  { fixture: "04x02y06502980", service: TavLetterCountCharacteristicService },
  {
    fixture: "03x03y400a50290",
    service: TavEastLetterCountCharacteristicService,
  },
  {
    fixture: "04x02y4610a900",
    service: TavInvertedLetterCountCharacteristicService,
  },
  {
    fixture: "03x03y610a50080",
    service: TavWestLetterCountCharacteristicService,
  },
];

describe(LetterCharacteristicsModule, () => {
  let contextService: CharacteristicContextService;
  const evaluators = new Map<
    Type<CharacteristicEvaluator<number>>,
    CharacteristicEvaluator<number>
  >();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, LetterCharacteristicsModule, MatrixModule],
      providers: [CharacteristicContextService],
    }).compile();

    contextService = await module.resolve(CharacteristicContextService);
    for (const { service } of LETTERS) {
      evaluators.set(service, await module.resolve(service));
    }
  });

  describe.each(
    LETTERS.map(({ fixture, service }) => ({
      fixture,
      name: service.name,
      service,
    })),
  )("$name's glyph", ({ fixture, service }) => {
    it("is counted by its own evaluator alone", () => {
      const context = contextService.create(fixture);
      const counts = LETTERS.map(({ service }) =>
        evaluators.get(service)?.compute(context),
      );
      const expected = LETTERS.map((letter) =>
        letter.fixture === fixture ? 1 : 0,
      );

      expect(counts).toStrictEqual(expected);
    });

    it("sets its evaluator's submatrix window to the glyph's inked extent", () => {
      const inked = contextService
        .create(fixture)
        .matrix.flatMap((points, row) =>
          points.flatMap((point, column) =>
            Object.values(point).includes(true) ? [{ column, row }] : [],
          ),
        );
      const window = {
        columns: new Set(inked.map(({ column }) => column)).size,
        rows: new Set(inked.map(({ row }) => row)).size,
      };

      expect(evaluators.get(service)?.metadata.submatrix).toStrictEqual(window);
    });
  });

  it("gives every letter glyph evaluator its own template, so no ink is counted twice", () => {
    const formulas = LETTERS.map(
      ({ service }) => evaluators.get(service)?.metadata.formula,
    );

    expect(new Set(formulas).size).toBe(LETTERS.length);
  });
});
