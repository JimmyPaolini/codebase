import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { JsonComparisonService } from "./json-comparison.service";
import { JsonValidatorService } from "./json-validator.service";

import type { PreparedValidationDocument } from "@jimmypaolini/conformetry-core";

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "tsconfig.json",
    instance: args.instance,
    instanceFilePath: "/project/tsconfig.json",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/tsconfig.json",
  };
}

describe(JsonValidatorService, () => {
  let service: JsonValidatorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [JsonComparisonService, JsonValidatorService],
    }).compile();

    service = await module.resolve(JsonValidatorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims JSON and JSONC files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([
      ".json",
      ".jsonc",
    ]);
    expect(service.descriptor.name).toBe("json");
  });

  it("accepts an instance that is a superset of the template", () => {
    expect(
      service.validateDocument(
        createDocument({
          instance: '{"a": 1, "b": 2}',
          renderedTemplate: '{"a": 1}',
        }),
      ),
    ).toStrictEqual([]);
  });

  it("reports a missing key", () => {
    const errors = service.validateDocument(
      createDocument({ instance: "{}", renderedTemplate: '{"a": 1}' }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('Missing required key "a"');
  });

  it("reads comments, so a commented tsconfig parses", () => {
    expect(
      service.validateDocument(
        createDocument({
          instance: '{\n  // a comment\n  "a": 1\n}',
          renderedTemplate: '{"a": 1}',
        }),
      ),
    ).toStrictEqual([]);
  });
});
