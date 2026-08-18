import { ScoringService } from "@conformetry/core";
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
      providers: [
        ScoringService,
        TypescriptNodesService,
        TypescriptTreeService,
      ],
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
        }).errors,
      ).toStrictEqual([]);
    });

    it("reports an import the instance lacks", () => {
      const { errors } = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse('import { a } from "alpha";\n'),
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]?.kindLabel).toBe("ImportDeclaration");
      expect(errors[0]?.nodeKey).toContain("alpha");
    });

    it("reports a class member the instance lacks", () => {
      const { errors } = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse("class Widget { alpha() {} }\n"),
      });

      expect(errors.some((error) => error.nodeKey?.includes("alpha"))).toBe(
        true,
      );
    });

    it("weighs a missing class by its whole subtree", () => {
      const leaf = service.compareTree({
        instanceNode: parse("class Widget {}\n"),
        templateNode: parse('import { a } from "alpha";\nclass Widget {}\n'),
      });
      const subtree = service.compareTree({
        instanceNode: parse("const nothing = 1;\n"),
        templateNode: parse(
          "class Widget { alpha() {} beta() {} gamma() {} }\n",
        ),
      });

      // Both report exactly one finding. Without subtree weighting a deleted
      // class would cost the same as a deleted import, which is the whole
      // reason the weight exists.
      expect(leaf.errors).toHaveLength(1);
      expect(subtree.errors).toHaveLength(1);
      expect(subtree.errors[0]?.weight).toBeGreaterThan(
        leaf.errors[0]?.weight ?? 0,
      );
    });

    it("counts a conforming tree's requirements toward the total", () => {
      const comparison = service.compareTree({
        instanceNode: parse("class Widget { alpha() {} }\n"),
        templateNode: parse("class Widget { alpha() {} }\n"),
      });

      expect(comparison.errors).toStrictEqual([]);
      expect(comparison.totalWeight).toBeGreaterThan(1);
    });

    it("charges a missing subtree the same whether present or absent", () => {
      const template = "class Widget { alpha() {} beta() {} }\n";
      const present = service.compareTree({
        instanceNode: parse(template),
        templateNode: parse(template),
      });
      const absent = service.compareTree({
        instanceNode: parse("const nothing = 1;\n"),
        templateNode: parse(template),
      });

      // The denominator must not move with the instance: a template asks for
      // the same amount whether or not the instance supplied any of it.
      expect(absent.totalWeight).toBe(present.totalWeight);
      expect(absent.errors[0]?.weight).toBe(present.totalWeight - 1);
    });

    it("ignores extra members the template does not declare", () => {
      expect(
        service.compareTree({
          instanceNode: parse("class Widget { alpha() {} beta() {} }\n"),
          templateNode: parse("class Widget { alpha() {} }\n"),
        }).errors,
      ).toStrictEqual([]);
    });
  });
});
