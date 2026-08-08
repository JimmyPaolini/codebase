import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidationService } from "./validation.service.js";

describe(ValidationService, () => {
  let service: ValidationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidationService],
    }).compile();

    service = await module.resolve(ValidationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
