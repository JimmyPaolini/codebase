import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsModule } from "./characteristics.module";
import { CornerCountCharacteristicService } from "./submatrix/corner/corner-count-characteristic.service";
import { NorthEastCornerCountCharacteristicService } from "./submatrix/corner/north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./submatrix/corner/north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./submatrix/corner/south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./submatrix/corner/south-west-corner-count-characteristic.service";
import { CrossCountCharacteristicService } from "./submatrix/cross/cross-count-characteristic.service";
import { EastForkCountCharacteristicService } from "./submatrix/fork/east-fork-count-characteristic.service";
import { ForkCountCharacteristicService } from "./submatrix/fork/fork-count-characteristic.service";
import { NorthForkCountCharacteristicService } from "./submatrix/fork/north-fork-count-characteristic.service";
import { SouthForkCountCharacteristicService } from "./submatrix/fork/south-fork-count-characteristic.service";
import { WestForkCountCharacteristicService } from "./submatrix/fork/west-fork-count-characteristic.service";
import { AEastLetterCountCharacteristicService } from "./submatrix/letter/a-east-letter-count-characteristic.service";
import { AInvertedLetterCountCharacteristicService } from "./submatrix/letter/a-inverted-letter-count-characteristic.service";
import { ALetterCountCharacteristicService } from "./submatrix/letter/a-letter-count-characteristic.service";
import { AWestLetterCountCharacteristicService } from "./submatrix/letter/a-west-letter-count-characteristic.service";
import { BLetterCountCharacteristicService } from "./submatrix/letter/b-letter-count-characteristic.service";
import { BSidewaysLetterCountCharacteristicService } from "./submatrix/letter/b-sideways-letter-count-characteristic.service";
import { CLetterCountCharacteristicService } from "./submatrix/letter/c-letter-count-characteristic.service";
import { CWestLetterCountCharacteristicService } from "./submatrix/letter/c-west-letter-count-characteristic.service";
import { EDownLetterCountCharacteristicService } from "./submatrix/letter/e-down-letter-count-characteristic.service";
import { ELetterCountCharacteristicService } from "./submatrix/letter/e-letter-count-characteristic.service";
import { EUpLetterCountCharacteristicService } from "./submatrix/letter/e-up-letter-count-characteristic.service";
import { EWestLetterCountCharacteristicService } from "./submatrix/letter/e-west-letter-count-characteristic.service";
import { FDownLetterCountCharacteristicService } from "./submatrix/letter/f-down-letter-count-characteristic.service";
import { FLetterCountCharacteristicService } from "./submatrix/letter/f-letter-count-characteristic.service";
import { FUpLetterCountCharacteristicService } from "./submatrix/letter/f-up-letter-count-characteristic.service";
import { FWestLetterCountCharacteristicService } from "./submatrix/letter/f-west-letter-count-characteristic.service";
import { HLetterCountCharacteristicService } from "./submatrix/letter/h-letter-count-characteristic.service";
import { HSidewaysLetterCountCharacteristicService } from "./submatrix/letter/h-sideways-letter-count-characteristic.service";
import { ILetterCountCharacteristicService } from "./submatrix/letter/i-letter-count-characteristic.service";
import { ISidewaysLetterCountCharacteristicService } from "./submatrix/letter/i-sideways-letter-count-characteristic.service";
import { LDownLetterCountCharacteristicService } from "./submatrix/letter/l-down-letter-count-characteristic.service";
import { LLetterCountCharacteristicService } from "./submatrix/letter/l-letter-count-characteristic.service";
import { LUpLetterCountCharacteristicService } from "./submatrix/letter/l-up-letter-count-characteristic.service";
import { LWestLetterCountCharacteristicService } from "./submatrix/letter/l-west-letter-count-characteristic.service";
import { MEastLetterCountCharacteristicService } from "./submatrix/letter/m-east-letter-count-characteristic.service";
import { MLetterCountCharacteristicService } from "./submatrix/letter/m-letter-count-characteristic.service";
import { MWestLetterCountCharacteristicService } from "./submatrix/letter/m-west-letter-count-characteristic.service";
import { NLetterCountCharacteristicService } from "./submatrix/letter/n-letter-count-characteristic.service";
import { NSidewaysLetterCountCharacteristicService } from "./submatrix/letter/n-sideways-letter-count-characteristic.service";
import { OLetterCountCharacteristicService } from "./submatrix/letter/o-letter-count-characteristic.service";
import { SLetterCountCharacteristicService } from "./submatrix/letter/s-letter-count-characteristic.service";
import { SSidewaysLetterCountCharacteristicService } from "./submatrix/letter/s-sideways-letter-count-characteristic.service";
import { TEastLetterCountCharacteristicService } from "./submatrix/letter/t-east-letter-count-characteristic.service";
import { TLetterCountCharacteristicService } from "./submatrix/letter/t-letter-count-characteristic.service";
import { TUpLetterCountCharacteristicService } from "./submatrix/letter/t-up-letter-count-characteristic.service";
import { TWestLetterCountCharacteristicService } from "./submatrix/letter/t-west-letter-count-characteristic.service";
import { UInvertedLetterCountCharacteristicService } from "./submatrix/letter/u-inverted-letter-count-characteristic.service";
import { ULetterCountCharacteristicService } from "./submatrix/letter/u-letter-count-characteristic.service";
import { WLetterCountCharacteristicService } from "./submatrix/letter/w-letter-count-characteristic.service";
import { XLetterCountCharacteristicService } from "./submatrix/letter/x-letter-count-characteristic.service";
import { YEastLetterCountCharacteristicService } from "./submatrix/letter/y-east-letter-count-characteristic.service";
import { YLetterCountCharacteristicService } from "./submatrix/letter/y-letter-count-characteristic.service";
import { YUpLetterCountCharacteristicService } from "./submatrix/letter/y-up-letter-count-characteristic.service";
import { YWestLetterCountCharacteristicService } from "./submatrix/letter/y-west-letter-count-characteristic.service";
import { ZLetterCountCharacteristicService } from "./submatrix/letter/z-letter-count-characteristic.service";
import { ZSidewaysLetterCountCharacteristicService } from "./submatrix/letter/z-sideways-letter-count-characteristic.service";
import { DotCountCharacteristicService } from "./submatrix/point/dot-count-characteristic.service";
import { HorizontalEdgeCountCharacteristicService } from "./submatrix/point/horizontal-edge-count-characteristic.service";
import { VerticalEdgeCountCharacteristicService } from "./submatrix/point/vertical-edge-count-characteristic.service";
import { HorizontalRectangleCountCharacteristicService } from "./submatrix/rectangle/horizontal-rectangle-count-characteristic.service";
import { VerticalRectangleCountCharacteristicService } from "./submatrix/rectangle/vertical-rectangle-count-characteristic.service";

import type { CharacteristicEvaluator } from "./characteristics.types";
import type { Type } from "@nestjs/common";

/** Every characteristic evaluator a consumer of `CharacteristicsModule` must be able to inject. */
const CHARACTERISTIC_SERVICES: readonly Type<CharacteristicEvaluator>[] = [
  ZSidewaysLetterCountCharacteristicService,
  YWestLetterCountCharacteristicService,
  YUpLetterCountCharacteristicService,
  YEastLetterCountCharacteristicService,
  UInvertedLetterCountCharacteristicService,
  TWestLetterCountCharacteristicService,
  TUpLetterCountCharacteristicService,
  TEastLetterCountCharacteristicService,
  SSidewaysLetterCountCharacteristicService,
  NSidewaysLetterCountCharacteristicService,
  MWestLetterCountCharacteristicService,
  MEastLetterCountCharacteristicService,
  LWestLetterCountCharacteristicService,
  LUpLetterCountCharacteristicService,
  LDownLetterCountCharacteristicService,
  ISidewaysLetterCountCharacteristicService,
  HSidewaysLetterCountCharacteristicService,
  FWestLetterCountCharacteristicService,
  FUpLetterCountCharacteristicService,
  FDownLetterCountCharacteristicService,
  EWestLetterCountCharacteristicService,
  EUpLetterCountCharacteristicService,
  EDownLetterCountCharacteristicService,
  CWestLetterCountCharacteristicService,
  BSidewaysLetterCountCharacteristicService,
  AWestLetterCountCharacteristicService,
  AInvertedLetterCountCharacteristicService,
  AEastLetterCountCharacteristicService,
  ZLetterCountCharacteristicService,
  YLetterCountCharacteristicService,
  XLetterCountCharacteristicService,
  WLetterCountCharacteristicService,
  ULetterCountCharacteristicService,
  TLetterCountCharacteristicService,
  SLetterCountCharacteristicService,
  OLetterCountCharacteristicService,
  NLetterCountCharacteristicService,
  MLetterCountCharacteristicService,
  LLetterCountCharacteristicService,
  ILetterCountCharacteristicService,
  HLetterCountCharacteristicService,
  FLetterCountCharacteristicService,
  ELetterCountCharacteristicService,
  CLetterCountCharacteristicService,
  BLetterCountCharacteristicService,
  ALetterCountCharacteristicService,
  CornerCountCharacteristicService,
  CrossCountCharacteristicService,
  DotCountCharacteristicService,
  EastForkCountCharacteristicService,
  ForkCountCharacteristicService,
  HorizontalEdgeCountCharacteristicService,
  HorizontalRectangleCountCharacteristicService,
  NorthEastCornerCountCharacteristicService,
  NorthForkCountCharacteristicService,
  NorthWestCornerCountCharacteristicService,
  SouthEastCornerCountCharacteristicService,
  SouthForkCountCharacteristicService,
  SouthWestCornerCountCharacteristicService,
  VerticalEdgeCountCharacteristicService,
  VerticalRectangleCountCharacteristicService,
  WestForkCountCharacteristicService,
];

/** The token a consumer module gathers every evaluator under, through a factory whose `inject` list only resolves exported providers. */
const EVALUATORS = Symbol("EVALUATORS");

/** The metadata key a service's class name promises: `DotCountCharacteristicService` fills `dotCount`. */
function expectedKey(service: Type<CharacteristicEvaluator>): string {
  const stem = service.name.replace(/CharacteristicService$/u, "");

  return stem.charAt(0).toLowerCase() + stem.slice(1);
}

describe(CharacteristicsModule, () => {
  let evaluators: readonly CharacteristicEvaluator[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
      providers: [
        {
          inject: [...CHARACTERISTIC_SERVICES],
          provide: EVALUATORS,
          useFactory: (
            ...injected: CharacteristicEvaluator[]
          ): CharacteristicEvaluator[] => injected,
        },
      ],
    }).compile();

    evaluators = module.get<CharacteristicEvaluator[]>(EVALUATORS);
  });

  describe.each(
    CHARACTERISTIC_SERVICES.map((service, index) => ({
      index,
      name: service.name,
      service,
    })),
  )("$name", ({ index, service }) => {
    it("is exported to a consumer that imports the module", () => {
      expect(evaluators[index]).toBeInstanceOf(service);
    });

    it("names its metadata key after its class", () => {
      expect(evaluators[index]?.metadata.key).toBe(expectedKey(service));
    });

    it("describes itself with a display name, a description, and a known category", () => {
      const metadata = evaluators[index]?.metadata;

      expect(metadata?.name).not.toBe("");
      expect(metadata?.description).not.toBe("");
      expect(["compound", "path", "submatrix"]).toContain(metadata?.category);
    });
  });

  it("gives every characteristic evaluator a unique metadata key", () => {
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
