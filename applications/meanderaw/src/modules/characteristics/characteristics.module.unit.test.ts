import { Inject, Injectable } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { CharacteristicsModule } from "./characteristics.module";
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
  CornerCountCharacteristicService,
  DotCountCharacteristicService,
  HorizontalEdgeCountCharacteristicService,
  NorthEastCornerCountCharacteristicService,
  NorthWestCornerCountCharacteristicService,
  SouthEastCornerCountCharacteristicService,
  SouthWestCornerCountCharacteristicService,
  VerticalEdgeCountCharacteristicService,
];

/**
 * Resolves `service` the way a real consumer would — injected into a provider
 * of a module that imports `CharacteristicsModule` — so an evaluator that is
 * provided but never exported fails to compile rather than passing.
 */
async function injectFromOutside(
  service: Type<CharacteristicEvaluator>,
): Promise<CharacteristicEvaluator> {
  @Injectable()
  class Consumer {
    constructor(
      @Inject(service) public readonly evaluator: CharacteristicEvaluator,
    ) {}
  }

  const module = await Test.createTestingModule({
    imports: [CharacteristicsModule],
    providers: [Consumer],
  }).compile();

  return module.get(Consumer).evaluator;
}

describe(CharacteristicsModule, () => {
  it.each(
    CHARACTERISTIC_SERVICES.map((service) => ({ name: service.name, service })),
  )("lets a consumer inject $name", async ({ service }) => {
    await expect(injectFromOutside(service)).resolves.toBeInstanceOf(service);
  });

  it("gives every characteristic evaluator a unique metadata key", async () => {
    const evaluators = await Promise.all(
      CHARACTERISTIC_SERVICES.map(async (service) =>
        injectFromOutside(service),
      ),
    );
    const keys = evaluators.map((evaluator) => evaluator.metadata.key);

    expect(new Set(keys).size).toBe(keys.length);
  });
});
