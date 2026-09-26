import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsModule } from "./characteristics.module";
import { BettiNumber0CountCharacteristicService } from "./path/topology/betti-number-0-count-characteristic.service";
import { BettiNumber1CountCharacteristicService } from "./path/topology/betti-number-1-count-characteristic.service";
import { FreeEndCountCharacteristicService } from "./path/topology/free-end-count-characteristic.service";
import { CornerCountCharacteristicService } from "./submatrix/corner/corner-count-characteristic.service";
import { NorthEastCornerCountCharacteristicService } from "./submatrix/corner/north-east-corner-count-characteristic.service";
import { NorthWestCornerCountCharacteristicService } from "./submatrix/corner/north-west-corner-count-characteristic.service";
import { SouthEastCornerCountCharacteristicService } from "./submatrix/corner/south-east-corner-count-characteristic.service";
import { SouthWestCornerCountCharacteristicService } from "./submatrix/corner/south-west-corner-count-characteristic.service";
import { DotCountCharacteristicService } from "./submatrix/point/dot-count-characteristic.service";
import { HorizontalEdgeCountCharacteristicService } from "./submatrix/point/horizontal-edge-count-characteristic.service";
import { VerticalEdgeCountCharacteristicService } from "./submatrix/point/vertical-edge-count-characteristic.service";

import type { CharacteristicEvaluator } from "./characteristics.types";
import type { Type } from "@nestjs/common";

/** Every characteristic evaluator a consumer of `CharacteristicsModule` must be able to inject. */
const CHARACTERISTIC_SERVICES: readonly Type<CharacteristicEvaluator>[] = [
  BettiNumber0CountCharacteristicService,
  BettiNumber1CountCharacteristicService,
  CornerCountCharacteristicService,
  DotCountCharacteristicService,
  FreeEndCountCharacteristicService,
  HorizontalEdgeCountCharacteristicService,
  NorthEastCornerCountCharacteristicService,
  NorthWestCornerCountCharacteristicService,
  SouthEastCornerCountCharacteristicService,
  SouthWestCornerCountCharacteristicService,
  VerticalEdgeCountCharacteristicService,
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
