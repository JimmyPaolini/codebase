import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptCommentsService } from "./typescript-comments.service";
import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";
import { TypescriptValidatorService } from "./typescript-validator.service";

import type {
  ConformanceError,
  PreparedValidationDocument,
} from "@jimmypaolini/conformetry-core";

function createDocument(args: {
  filename?: string;
  instance: string;
  renderedTemplate: string;
}): PreparedValidationDocument {
  const filename = args.filename ?? "example.service.ts";

  return {
    filename,
    instance: args.instance,
    instanceFilePath: `/project/${filename}`,
    renderedTemplate: args.renderedTemplate,
    templateFilePath: `/templates/${filename}`,
  };
}

describe(TypescriptValidatorService, () => {
  let service: TypescriptValidatorService;

  function validate(
    renderedTemplate: string,
    instance: string,
  ): ConformanceError[] {
    return service.validateDocument(
      createDocument({ instance, renderedTemplate }),
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TypescriptCommentsService,
        TypescriptNodesService,
        TypescriptTreeService,
        TypescriptValidatorService,
      ],
    }).compile();

    service = await module.resolve(TypescriptValidatorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("claims TypeScript files", () => {
    expect(service.descriptor.fileExtensions).toStrictEqual([".ts", ".tsx"]);
    expect(service.descriptor.name).toBe("typescript");
  });

  describe("structure", () => {
    it("accepts an instance that adds declarations", () => {
      expect(
        validate(
          "export class A {}\n",
          "export class A {}\nexport class B {}\n",
        ),
      ).toStrictEqual([]);
    });

    it("accepts reordered declarations", () => {
      expect(
        validate(
          "export class A {}\nexport class B {}\n",
          "export class B {}\nexport class A {}\n",
        ),
      ).toStrictEqual([]);
    });

    it("reports a missing class", () => {
      const errors = validate("export class Widget {}\n", "");

      expect(errors).toHaveLength(1);
      expect(errors[0]?.message).toContain('"Widget"');
      expect(errors[0]?.language).toBe("typescript");
    });

    it("reports a missing import by module specifier", () => {
      const errors = validate('import { A } from "./a";\n', "");

      expect(errors[0]?.message).toContain('"./a"');
    });

    it("reports a missing decorator", () => {
      const errors = validate(
        'import { Injectable } from "@nestjs/common";\n@Injectable()\nexport class A {}\n',
        'import { Injectable } from "@nestjs/common";\nexport class A {}\n',
      );

      expect(errors.some((error) => error.message.includes("Injectable"))).toBe(
        true,
      );
    });

    it("carries instance and template locations", () => {
      const errors = validate("export class Widget {}\n", "const x = 1;\n");

      expect(errors[0]?.templateLine).toBe(1);
      expect(errors[0]?.instanceLine).toBe(1);
      expect(errors[0]?.instanceColumn).toBeGreaterThan(0);
    });

    it("carries an actionable fix", () => {
      const errors = validate("export class Widget {}\n", "");

      expect(errors[0]?.fix).toContain("Add the missing");
    });
  });

  describe("comments", () => {
    const SECTIONED_TEMPLATE = [
      "export class A {",
      "  // 🏗 Dependency Injection",
      "  // 🔏 Private Methods",
      "  // 🌎 Public Methods",
      "}",
      "",
    ].join("\n");

    it("accepts section markers in the template's order", () => {
      expect(validate(SECTIONED_TEMPLATE, SECTIONED_TEMPLATE)).toStrictEqual(
        [],
      );
    });

    it("reports a missing section marker", () => {
      const errors = validate(
        SECTIONED_TEMPLATE,
        "export class A {\n  // 🏗 Dependency Injection\n  // 🌎 Public Methods\n}\n",
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]?.errorType).toBe("comment");
      expect(errors[0]?.message).toContain("🔏 Private Methods");
    });

    it("reports markers present but out of order", () => {
      const errors = validate(
        SECTIONED_TEMPLATE,
        [
          "export class A {",
          "  // 🌎 Public Methods",
          "  // 🔏 Private Methods",
          "  // 🏗 Dependency Injection",
          "}",
          "",
        ].join("\n"),
      );

      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every((error) => error.errorType === "comment")).toBe(true);
    });

    it("treats a TODO template comment as a placeholder", () => {
      expect(
        validate(
          "/** TODO: Document the a service. */\nexport class A {}\n",
          "/** Owns widgets. */\nexport class A {}\n",
        ),
      ).toStrictEqual([]);
    });
  });
});
