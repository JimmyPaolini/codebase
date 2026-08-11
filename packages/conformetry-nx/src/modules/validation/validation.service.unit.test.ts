import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { VALIDATION_SERVICE_NAME } from "./validation.constants.js";
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

  it("returns the validation service name", () => {
    expect(service.getValidationName()).toBe(VALIDATION_SERVICE_NAME);
  });
});
