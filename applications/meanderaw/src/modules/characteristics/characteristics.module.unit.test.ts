import { MODULE_METADATA } from "@nestjs/common/constants";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsModule } from "./characteristics.module";
import { POINT_CHARACTERISTIC_SERVICES } from "./submatrix/point/point-characteristics.constants";

import type { CharacteristicEvaluator } from "./characteristics.types";
import type { TestingModule } from "@nestjs/testing";

/** Every characteristic evaluator group the module is expected to provide and export. */
const CHARACTERISTIC_SERVICES = [...POINT_CHARACTERISTIC_SERVICES];

/** The same groups, named for readable test titles. */
const CHARACTERISTIC_SERVICE_CASES = CHARACTERISTIC_SERVICES.map((service) => ({
  name: service.name,
  service,
}));

describe(CharacteristicsModule, () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [CharacteristicsModule],
    }).compile();
  });

  it.each(CHARACTERISTIC_SERVICE_CASES)("provides $name", ({ service }) => {
    expect(
      module.select(CharacteristicsModule).get(service, { strict: true }),
    ).toBeInstanceOf(service);
  });

  it.each(CHARACTERISTIC_SERVICE_CASES)("exports $name", ({ service }) => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, CharacteristicsModule),
    ).toContain(service);
  });

  it("gives every characteristic evaluator a unique metadata key", () => {
    const keys = CHARACTERISTIC_SERVICES.map(
      (service) => module.get<CharacteristicEvaluator>(service).metadata.key,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });
});
