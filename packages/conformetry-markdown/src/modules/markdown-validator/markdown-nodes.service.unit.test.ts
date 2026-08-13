import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { MarkdownNodesService } from "./markdown-nodes.service";

describe(MarkdownNodesService, () => {
  let service: MarkdownNodesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MarkdownNodesService],
    }).compile();

    service = await module.resolve(MarkdownNodesService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("filterNodes", () => {
    it("keeps children that look like mdast nodes", () => {
      expect(
        service.filterNodes([{ type: "paragraph" }, null, "text", 42]),
      ).toStrictEqual([{ type: "paragraph" }]);
    });

    it("returns nothing for an empty child list", () => {
      expect(service.filterNodes([])).toStrictEqual([]);
    });
  });

  describe("readChildren", () => {
    it("reads a node's children", () => {
      expect(
        service.readChildren({
          children: [{ type: "text", value: "hello" }],
          type: "paragraph",
        }),
      ).toStrictEqual([{ type: "text", value: "hello" }]);
    });

    it("returns nothing for a leaf", () => {
      expect(service.readChildren({ type: "thematicBreak" })).toStrictEqual([]);
    });
  });

  describe("readText", () => {
    it("renders a node's plain text", () => {
      expect(
        service.readText({
          children: [{ type: "text", value: "hello" }],
          type: "paragraph",
        }),
      ).toBe("hello");
    });
  });

  describe("matches", () => {
    it("rejects nodes of different types", () => {
      expect(
        service.matches({
          instanceNode: { type: "code" },
          templateNode: { type: "paragraph" },
        }),
      ).toBe(false);
    });

    it("accepts nodes with the same rendered text", () => {
      expect(
        service.matches({
          instanceNode: {
            children: [{ type: "text", value: "hello" }],
            type: "paragraph",
          },
          templateNode: {
            children: [{ type: "text", value: "hello" }],
            type: "paragraph",
          },
        }),
      ).toBe(true);
    });
  });
});
