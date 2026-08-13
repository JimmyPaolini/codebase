import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NxGeneratorFactoryService } from "./nx-generator-factory.service";

describe(NxGeneratorFactoryService, () => {
  let service: NxGeneratorFactoryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NxGeneratorFactoryService],
    }).compile();

    service = await module.resolve(NxGeneratorFactoryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
