import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorTemplateService } from "./validator-template.service";

describe(ValidatorTemplateService, () => {
  let service: ValidatorTemplateService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorTemplateService],
    }).compile();

    service = await module.resolve(ValidatorTemplateService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });
});
