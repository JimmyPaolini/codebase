import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { CharacteristicsShapeService } from "./characteristics-shape.service";

describe(CharacteristicsShapeService, () => {
  let service: CharacteristicsShapeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CharacteristicsShapeService],
    }).compile();

    service = await module.resolve(CharacteristicsShapeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
