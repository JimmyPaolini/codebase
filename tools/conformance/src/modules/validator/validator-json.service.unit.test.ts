import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorJsonService } from "./validator-json.service";
import { ValidatorTemplateService } from "./validator-template.service";

describe(ValidatorJsonService, () => {
  let service: ValidatorJsonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorJsonService, ValidatorTemplateService],
    }).compile();

    service = await module.resolve(ValidatorJsonService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts a structural superset", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        extra: "allowed",
        items: [1, 2, 3],
        name: "example",
        nested: { count: 1, extra: true },
      }),
      template: JSON.stringify({
        items: [1, 2],
        name: "example",
        nested: { count: 1 },
      }),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports missing nested object keys and array members", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        items: [1, 3],
        nested: { count: 1 },
      }),
      template: JSON.stringify({
        items: [1, 2],
        nested: { count: 1, label: "missing" },
      }),
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          errorType: "code",
          instancePath: "nested.label",
          language: "json",
          templatePath: "nested.label",
        }),
        expect.objectContaining({
          errorType: "code",
          instancePath: "items[2]",
          language: "json",
          templatePath: "items[2]",
        }),
      ]),
    );
  });

  it("reports primitive mismatches with expected and actual values", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({ status: "draft" }),
      template: JSON.stringify({ status: "published" }),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      actual: '"draft"',
      expected: '"published"',
      instancePath: "status",
      templatePath: "status",
    });
  });

  it("reports missing composite array members when the instance array is empty", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        items: [],
      }),
      template: JSON.stringify({
        items: [{ id: 1 }],
      }),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      instancePath: "items",
      message: 'Missing required value: "items"',
      templatePath: "items",
    });
  });

  it("matches nested arrays against the candidate with the fewest errors", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        rows: [
          { id: 1, values: ["x"] },
          { id: 2, values: ["x", "y"] },
        ],
      }),
      template: JSON.stringify({
        rows: [{ id: 2, values: ["x", "y"] }],
      }),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("prefers object-array candidate with fewer nested errors", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        rows: [
          { id: 1, values: ["x"] },
          { id: 2, values: ["x", "y"] },
        ],
      }),
      template: JSON.stringify({
        rows: [{ id: 1, values: ["x", "y"] }],
      }),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      instancePath: 'rows[0].values["y"]',
      templatePath: 'rows[0].values["y"]',
    });
  });

  it("formats nested object paths for missing keys", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        nested: {
          values: [{}],
        },
      }),
      template: JSON.stringify({
        nested: {
          values: [{ value: 1 }],
        },
      }),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      instancePath: "nested.values[0].value",
      templatePath: "nested.values[0].value",
    });
  });

  it("treats undefined object keys as null when validating nested values", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify({
        nested: {
          value: null,
        },
      }),
      template: JSON.stringify({
        nested: {
          value: null,
        },
      }),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports top-level type mismatches", () => {
    const result = service.validateJsonConformance({
      data: {},
      filename: "example.json",
      instance: JSON.stringify([1, 2, 3]),
      template: JSON.stringify({ count: 3 }),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      instancePath: "",
      templatePath: "",
    });
  });
});
