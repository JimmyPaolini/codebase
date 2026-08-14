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

  describe("how nodes are keyed", () => {
    it("keys a called decorator by its callee", () => {
      const source = "@Injectable()\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a bare decorator by its own name", () => {
      const source = "@Injectable\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("reports a decorator replaced by a different one", () => {
      expect(
        validate(
          "@Injectable()\nexport class Widget {}\n",
          "@Controller()\nexport class Widget {}\n",
        ).length,
      ).toBeGreaterThan(0);
    });

    it("keys a dotted callee by its whole path", () => {
      const source = "@Nest.Injectable()\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a callee that is not an identifier at all", () => {
      const source = "getRunner()();\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a decorator whose callee is not an identifier", () => {
      const source = "@(factory())\nexport class Widget {}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement by a numeric first argument", () => {
      expect(validate("retry(1);\n", "retry(2);\n").length).toBeGreaterThan(0);
    });

    it("keys a call statement whose argument is neither string nor number", () => {
      const source = "run({ mode: 1 });\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a call statement whose argument is an identifier", () => {
      const source = "const mode = 1;\nrun(mode);\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("picks the closest of two equally plausible siblings", () => {
      const source =
        "export class Widget {\n" +
        "  public alpha(): void {}\n\n" +
        "  public beta(): void {}\n" +
        "}\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("keys a re-export by the module it names", () => {
      const source = 'export { alpha } from "./alpha";\n';

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("reports a re-export of a different module", () => {
      expect(
        validate(
          'export { alpha } from "./alpha";\n',
          'export { alpha } from "./beta";\n',
        ).length,
      ).toBeGreaterThan(0);
    });

    it("ignores an export that names no module", () => {
      const source = "const alpha = 1;\nexport { alpha };\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("tells two call statements apart by their first argument", () => {
      expect(
        validate(
          'describe("alpha", () => {});\n',
          'describe("beta", () => {});\n',
        ).length,
      ).toBeGreaterThan(0);
    });

    it("keys a call statement with no literal argument by its callee alone", () => {
      const source = "run();\n";

      expect(validate(source, source)).toStrictEqual([]);
    });

    it("ignores a statement that is not a call at all", () => {
      const source = "let counter = 0;\ncounter += 1;\n";

      expect(validate(source, source)).toStrictEqual([]);
    });
  });
});
