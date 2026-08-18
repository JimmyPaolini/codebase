import { ScoringService } from "@conformetry/core";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { MarkdownTreeService } from "./markdown-tree.service";

import type { MarkdownNode } from "./markdown-validator.types";

/** A paragraph rendering to the given text. */
function paragraph(value: string): MarkdownNode {
  return { children: [{ type: "text", value }], type: "paragraph" };
}

describe(MarkdownTreeService, () => {
  let service: MarkdownTreeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MarkdownNodesService, MarkdownTreeService, ScoringService],
    }).compile();

    service = await module.resolve(MarkdownTreeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compareChildren", () => {
    it("reports nothing when the instance has every template node", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha"), paragraph("beta")],
          templateChildren: [paragraph("alpha"), paragraph("beta")],
        }).errors,
      ).toStrictEqual([]);
    });

    it("reports a template node the instance lacks", () => {
      const { errors } = service.compareChildren({
        instanceChildren: [paragraph("alpha")],
        templateChildren: [paragraph("alpha"), paragraph("beta")],
      });

      expect(errors).toHaveLength(1);
      expect(errors[0]?.text).toBe("beta");
      expect(errors[0]?.nodeType).toBe("paragraph");
    });

    it("ignores extra instance nodes the template does not mention", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha"), paragraph("extra")],
          templateChildren: [paragraph("alpha")],
        }).errors,
      ).toStrictEqual([]);
    });

    it("reports nothing for an empty template", () => {
      expect(
        service.compareChildren({
          instanceChildren: [paragraph("alpha")],
          templateChildren: [],
        }).errors,
      ).toStrictEqual([]);
    });

    it("requires only the shape of a childless template container", () => {
      // A template list with no items asks for *a list*, not for any
      // particular item, so an instance list of any content satisfies it.
      expect(
        service.compareChildren({
          instanceChildren: [
            {
              children: [{ children: [paragraph("alpha")], type: "listItem" }],
              ordered: false,
              type: "list",
            },
          ],
          templateChildren: [{ children: [], ordered: false, type: "list" }],
        }).errors,
      ).toStrictEqual([]);
    });
  });
});
