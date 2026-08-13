import { Test } from "@nestjs/testing";
import { createSourceFile, ScriptKind, ScriptTarget } from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorCommentsService } from "./validator-comments.service";

describe(ValidatorCommentsService, () => {
  let service: ValidatorCommentsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorCommentsService],
    }).compile();

    service = await module.resolve(ValidatorCommentsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts exact comment matches and TODO wildcard comments", () => {
    const templateFile = createSourceFile(
      "template.ts",
      [
        "// exact match",
        "const firstValue = 1;",
        "// TODO: any implementation",
        "const secondValue = 2;",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      [
        "// exact match",
        "const firstValue = 1;",
        "// not the same text",
        "const secondValue = 2;",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    expect(
      service.validateAllComments({
        instanceFile,
        language: "typescript",
        templateFile,
      }),
    ).toStrictEqual([]);
  });

  it("reports missing comments with template location metadata", () => {
    const templateFile = createSourceFile(
      "template.ts",
      [
        "// first comment",
        "const firstValue = 1;",
        "// second comment",
        "const secondValue = 2;",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      ["// first comment", "const firstValue = 1;"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    expect(
      service.validateAllComments({
        instanceFile,
        language: "typescript",
        templateFile,
      }),
    ).toStrictEqual([
      {
        errorType: "comment",
        expected: "// second comment",
        fix: "Add the comment `// second comment` to the instance file.",
        instanceColumn: 1,
        instanceLine: 1,
        language: "typescript",
        message: 'Missing comment: "// second comment"',
        templateColumn: 1,
        templateLine: 3,
      },
    ]);
  });
});
