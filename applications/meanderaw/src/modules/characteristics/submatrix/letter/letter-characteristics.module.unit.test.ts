import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { AEastLetterCountCharacteristicService } from "./a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./a-west-letter-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./c-west-letter-count-characteristic.service";
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
import { LDownLetterCountCharacteristicService } from "./l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./l-west-letter-count-characteristic.service";
import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { MEastLetterCountCharacteristicService } from "./m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./m-west-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./s-sideways-letter-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./t-west-letter-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./y-west-letter-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./z-sideways-letter-count-characteristic.service";

import type { CharacteristicEvaluator } from "../../characteristics.types";
import type { Type } from "@nestjs/common";

/** Every letter glyph evaluator beside a Code holding one isolated copy of its glyph and nothing else. */
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
    LETTERS.map(({ fixture, service }) => ({ fixture, name: service.name })),
  )("$name's glyph", ({ fixture }) => {
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
  });
});
