import { Test } from "@nestjs/testing";
import ts from "typescript";
import { beforeAll, describe, expect, it } from "vitest";

import { TypescriptNodesService } from "./typescript-nodes.service";
import { TypescriptTreeService } from "./typescript-tree.service";

/** Parses source into a comparable source-file node. */
function parse(source: string): ts.SourceFile {
  return ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest, true);
}

describe(TypescriptTreeService, () => {
  let service: TypescriptTreeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [TypescriptNodesService, TypescriptTreeService],
    }).compile();

    service = await module.resolve(TypescriptTreeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compareTree", () => {
    it("reports nothing when the instance has everything the template declares", () => {
      expect(
        service.compareTree({
          instanceNode: parse('import { a } from "alpha";\nclass Widget {}\n'),
          templateNode: parse('import { a } from "alpha";\n'),
        }),
      ).toStrictEqual([]);
    });

    it("reports an import the instance lacks", () => {
      const errors = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse('import { a } from "alpha";\n'),
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]?.kindLabel).toBe("ImportDeclaration");
      expect(errors[0]?.nodeKey).toContain("alpha");
    });

    it("reports a class member the instance lacks", () => {
      const errors = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse("class Widget { alpha() {} }\n"),
      });

      expect(errors.some((error) => error.nodeKey?.includes("alpha"))).toBe(
        true,
      );
    });

    it("ignores extra members the template does not declare", () => {
      expect(
        service.compareTree({
          instanceNode: parse("class Widget { alpha() {} beta() {} }\n"),
          templateNode: parse("class Widget { alpha() {} }\n"),
        }),
      ).toStrictEqual([]);
    });
  });
});
