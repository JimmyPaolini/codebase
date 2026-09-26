import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../../../code/code.module";
import { MatrixModule } from "../../../matrix/matrix.module";
import { CharacteristicContextService } from "../../characteristic-context.service";

import { ALetterCountCharacteristicService } from "./a-letter-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./b-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./c-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./e-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./f-letter-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./h-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./i-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./l-letter-count-characteristic.service";
import { LetterCharacteristicsModule } from "./letter-characteristics.module";
import { MLetterCountCharacteristicService } from "./m-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./n-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./o-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./s-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./t-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./w-letter-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./x-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./y-letter-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./z-letter-count-characteristic.service";

import type { CharacteristicEvaluator } from "../../characteristics.types";
import type { Type } from "@nestjs/common";

/** Every letter glyph evaluator beside a Code holding one isolated copy of its glyph and nothing else. */
const LETTERS: readonly {
  readonly fixture: string;
  readonly service: Type<CharacteristicEvaluator<number>>;
}[] = [
  { fixture: "03x03y650ed0880", service: ALetterCountCharacteristicService },
  { fixture: "03x03y650ed0a90", service: BLetterCountCharacteristicService },
  { fixture: "03x02y610a10", service: CLetterCountCharacteristicService },
  { fixture: "03x03y610e10a10", service: ELetterCountCharacteristicService },
  { fixture: "03x03y610e10800", service: FLetterCountCharacteristicService },
  { fixture: "03x03y440ed0880", service: HLetterCountCharacteristicService },
  { fixture: "02x02y4080", service: ILetterCountCharacteristicService },
  { fixture: "03x02y400a10", service: LLetterCountCharacteristicService },
  { fixture: "04x03y6750c8c08080", service: MLetterCountCharacteristicService },
  { fixture: "04x03y6540ccc08a90", service: NLetterCountCharacteristicService },
  { fixture: "03x02y650a90", service: OLetterCountCharacteristicService },
  { fixture: "03x03y610a50290", service: SLetterCountCharacteristicService },
  { fixture: "04x02y27100800", service: TLetterCountCharacteristicService },
  { fixture: "03x02y440a90", service: ULetterCountCharacteristicService },
  { fixture: "04x03y4040c4c0ab90", service: WLetterCountCharacteristicService },
  { fixture: "04x03y04002f100800", service: XLetterCountCharacteristicService },
  { fixture: "04x03y4040a7900800", service: YLetterCountCharacteristicService },
  { fixture: "03x03y250690a10", service: ZLetterCountCharacteristicService },
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
