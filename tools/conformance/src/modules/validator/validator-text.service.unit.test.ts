import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorTemplateService } from "./validator-template.service";
import { ValidatorTextService } from "./validator-text.service";

describe(ValidatorTextService, () => {
  let service: ValidatorTextService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorTextService, ValidatorTemplateService],
    }).compile();

    service = await module.resolve(ValidatorTextService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts duplicate lines when the instance has enough copies", () => {
    const result = service.validateTextConformance({
      data: {},
      filename: "example.txt",
      instance: ["alpha", "alpha", "beta"].join("\n"),
      template: ["alpha", "alpha"].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports missing lines with template positions", () => {
    const result = service.validateTextConformance({
      data: {},
      filename: "example.txt",
      instance: ["alpha"].join("\n"),
      template: ["alpha", "beta", "beta"].join("\n"),
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatchObject({
      errorType: "code",
      expected: "beta",
      language: "text",
      message: "Missing line: beta",
      templateLine: 2,
    });
    expect(result.errors[1]).toMatchObject({
      errorType: "code",
      expected: "beta",
      language: "text",
      message: "Missing line: beta",
      templateLine: 3,
    });
  });
});
