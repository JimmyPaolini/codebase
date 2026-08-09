import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationTargetService } from "./validation-target.service";

describe(ValidationTargetService, () => {
  let service: ValidationTargetService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidationTargetService],
    }).compile();

    service = await module.resolve(ValidationTargetService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
