import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TextValidatorService } from "./text-validator.service";

import type { PreparedValidationDocument } from "@conformetry/core";

function createDocument(args: {
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  return {
    filename: "notes.txt",
    instance: args.instance,
    instanceFilePath: "/project/notes.txt",
    renderedTemplate: args.renderedTemplate,
    templateFilePath: "/templates/notes.txt",
  };
}

describe(TextValidatorService, () => {
  let service: TextValidatorService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TextValidatorService],
    }).compile();

    service = await module.resolve(TextValidatorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims only .txt files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".txt"]);
    expect(service.descriptor.name).toBe("text");
  });

  it("accepts an instance containing every template line", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "a\nb", renderedTemplate: "a\nb" }),
      ),
    ).toStrictEqual([]);
  });

  it("accepts extra lines, since the template is a lower bound", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "a\nextra\nb", renderedTemplate: "a\nb" }),
      ),
    ).toStrictEqual([]);
  });

  it("ignores line order", () => {
    expect(
      service.validateDocument(
        createDocument({ instance: "b\na", renderedTemplate: "a\nb" }),
      ),
    ).toStrictEqual([]);
  });

  it("reports a missing line with its template line number", () => {
    const errors = service.validateDocument(
      createDocument({ instance: "a", renderedTemplate: "a\nmissing" }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe("Missing line: missing");
    expect(errors[0]?.templateLine).toBe(2);
    expect(errors[0]?.expected).toBe("missing");
    expect(errors[0]?.language).toBe("text");
  });

  it("requires a duplicated template line to appear as often", () => {
    const errors = service.validateDocument(
      createDocument({ instance: "a", renderedTemplate: "a\na" }),
    );

    expect(errors).toHaveLength(1);
    expect(errors[0]?.templateLine).toBe(2);
  });

  it("carries an actionable fix", () => {
    const errors = service.validateDocument(
      createDocument({ instance: "", renderedTemplate: "needed" }),
    );

    expect(errors[0]?.fix).toBe("Add the line `needed` to the instance file.");
  });
});
