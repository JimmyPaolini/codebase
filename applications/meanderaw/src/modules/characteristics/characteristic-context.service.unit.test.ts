import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CodeModule } from "../code/code.module";
import { MatrixModule } from "../matrix/matrix.module";

import { CharacteristicContextService } from "./characteristic-context.service";

describe(CharacteristicContextService, () => {
  let service: CharacteristicContextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CodeModule, MatrixModule],
      providers: [CharacteristicContextService],
    }).compile();

    service = await module.resolve(CharacteristicContextService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("reads a formatted Code into its shape, parsed Code, and decoded matrix", () => {
    const context = service.create("02x01y2c");

    expect(context.rows).toBe(1);
    expect(context.columns).toBe(2);
    expect(context.code).toStrictEqual({
      columns: 2,
      digits: "2c",
      repeats: 1,
      rows: 1,
    });
    expect(context.matrix).toStrictEqual([
      [
        { east: true, north: false, south: false, west: false },
        { east: false, north: true, south: true, west: false },
      ],
    ]);
  });

  it("accepts an already parsed Code without reducing it to its unit", () => {
    const context = service.create({
      columns: 2,
      digits: "3333",
      repeats: 1,
      rows: 2,
    });

    expect(context.rows).toBe(2);
    expect(context.columns).toBe(2);
    expect(context.matrix).toHaveLength(2);
    expect(context.matrix[1]).toHaveLength(2);
  });
});
