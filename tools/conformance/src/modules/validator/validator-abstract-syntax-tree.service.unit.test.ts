import { Test } from "@nestjs/testing";
import { createSourceFile, ScriptKind, ScriptTarget } from "typescript";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ValidatorAbstractSyntaxTreeService } from "./validator-abstract-syntax-tree.service";

describe(ValidatorAbstractSyntaxTreeService, () => {
  let service: ValidatorAbstractSyntaxTreeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorAbstractSyntaxTreeService],
    }).compile();

    service = await module.resolve(ValidatorAbstractSyntaxTreeService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts matching keyed and keyless nested children", () => {
    const templateFile = createSourceFile(
      "template.ts",
      ["class Example {", "  sampleCall();", "  value: string;", "}"].join(
        "\n",
      ),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      [
        "class Example {",
        "  sampleCall();",
        "  value: string;",
        "  sampleCall();",
        "}",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    expect(
      service.validateDepthFirstSearch({
        instanceFile,
        instanceNode: instanceFile,
        language: "typescript",
        templateNode: templateFile,
      }),
    ).toStrictEqual([]);
  });

  it("reports missing keyed children with breadcrumb details", () => {
    const templateFile = createSourceFile(
      "template.ts",
      ["class Example {", "  sampleCall();", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      ["class Example {", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    expect(
      service.validateDepthFirstSearch({
        instanceFile,
        instanceNode: instanceFile,
        language: "typescript",
        templateNode: templateFile,
      }),
    ).toHaveLength(1);
  });

  it("reports missing keyless children when no same-kind node exists", () => {
    const templateFile = createSourceFile(
      "template.ts",
      ["if (flag) {", "  execute();", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      ["const value = 1;"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const errors = service.validateDepthFirstSearch({
      instanceFile,
      instanceNode: instanceFile,
      language: "typescript",
      templateNode: templateFile,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("Missing IfStatement");
  });

  it("chooses the keyless candidate with fewer nested errors", () => {
    const templateFile = createSourceFile(
      "template.ts",
      ["if (flag) {", "  alpha();", "  beta();", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      [
        "if (flag) {",
        "  alpha();",
        "}",
        "if (flag) {",
        "  alpha();",
        "  beta();",
        "}",
      ].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    expect(
      service.validateDepthFirstSearch({
        instanceFile,
        instanceNode: instanceFile,
        language: "typescript",
        templateNode: templateFile,
      }),
    ).toStrictEqual([]);
  });

  it("uses reduce tie branch when keyless candidates produce equal errors", () => {
    const templateFile = createSourceFile(
      "template.ts",
      ["if (flag) {", "  alpha();", "  beta();", "}"].join("\n"),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );
    const instanceFile = createSourceFile(
      "instance.ts",
      ["if (flag) {", "  alpha();", "}", "if (flag) {", "  alpha();", "}"].join(
        "\n",
      ),
      ScriptTarget.Latest,
      true,
      ScriptKind.TS,
    );

    const errors = service.validateDepthFirstSearch({
      instanceFile,
      instanceNode: instanceFile,
      language: "typescript",
      templateNode: templateFile,
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain("Missing ExpressionStatement");
  });
});
