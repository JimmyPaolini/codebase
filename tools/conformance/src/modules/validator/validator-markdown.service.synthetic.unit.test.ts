import { beforeEach, describe, expect, it, vi } from "vitest";

import { ValidatorTemplateService } from "./validator-template.service";

import type { MdastNode } from "./validator-markdown.types";

interface RemarkRoot {
  children: MdastNode[];
  type: "root";
}

const createPositionedNode = (node: MdastNode, line: number): MdastNode => ({
  ...node,
  position: {
    end: {
      column: 1,
      line,
    },
    start: {
      column: 1,
      line,
    },
  },
});

const createRoot = (children: MdastNode[]): RemarkRoot => ({
  children,
  type: "root",
});

describe("validatorMarkdownService synthetic branches", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("remark");
    vi.doUnmock("remark-gfm");
  });

  it("uses fallback error messaging and omits instance line when hint end line is missing", async () => {
    const parseMock = vi
      .fn<(markdown: string) => unknown>()
      .mockReturnValueOnce({
        children: [
          {
            children: [{ type: "text", value: "Title" }],
            depth: 1,
            position: {
              start: { column: 1, line: 1 },
            },
            type: "heading",
          },
          {
            position: {
              start: { column: 1, line: 3 },
            },
            type: "mystery",
            value: "template mystery",
          },
        ],
        type: "root",
      })
      .mockReturnValueOnce({
        children: [
          {
            children: [{ type: "text", value: "Title" }],
            depth: 1,
            position: {
              start: { column: 1, line: 1 },
            },
            type: "heading",
          },
          {
            type: "mystery",
            value: "instance mystery",
          },
        ],
        type: "root",
      });

    vi.doMock("remark", () => {
      const processor = {
        parse: parseMock,
        use: vi.fn<() => unknown>().mockReturnThis(),
      };

      return {
        remark: () => processor,
      };
    });

    vi.doMock("remark-gfm", () => ({
      default: {},
    }));

    const importedModule = await import("./validator-markdown.service");
    const syntheticService = new importedModule.ValidatorMarkdownService(
      new ValidatorTemplateService(),
    );

    const result = syntheticService.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "instance",
      template: "template",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      message: 'Expected mystery: "template mystery"',
      templateColumn: 1,
      templateLine: 3,
    });
    expect(result.errors[0]?.instanceLine).toBeUndefined();
    expect(result.errors[0]?.instanceColumn).toBeUndefined();
  });

  it("covers uncommon markdown error builders using synthetic mdast nodes", async () => {
    const templateRoot = createRoot([
      createPositionedNode({ type: "inlineMath", value: "x+y" }, 1),
      createPositionedNode({ type: "linkReference" }, 2),
      createPositionedNode({ type: "math" }, 3),
      createPositionedNode({ type: "yaml", value: "title: sample" }, 4),
    ]);

    vi.doMock("remark", () => {
      const processor = {
        parse: vi
          .fn<(markdown: string) => unknown>()
          .mockReturnValueOnce(templateRoot)
          .mockReturnValueOnce(createRoot([])),
        use: vi.fn<() => unknown>().mockReturnThis(),
      };

      return {
        remark: () => processor,
      };
    });

    vi.doMock("remark-gfm", () => ({
      default: {},
    }));

    const importedModule = await import("./validator-markdown.service");
    const syntheticService = new importedModule.ValidatorMarkdownService(
      new ValidatorTemplateService(),
    );

    const result = syntheticService.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "instance",
      template: "template",
    });

    expect(result.errors).toHaveLength(4);
    expect(result.errors.map((error) => error.message)).toStrictEqual(
      expect.arrayContaining([
        'Expected inlineMath: "x+y"',
        'Expected linkReference: ""',
        'Expected math: ""',
        'Expected yaml: "title: sample"',
      ]),
    );
  });

  it("covers additional markdown node matcher branches", async () => {
    const templateRoot = createRoot([
      createPositionedNode(
        {
          children: [{ type: "text", value: "Title" }],
          depth: 2,
          type: "heading",
        },
        1,
      ),
      createPositionedNode({ lang: "ts", type: "code", value: "value" }, 2),
      createPositionedNode(
        {
          children: [{ type: "text", value: "Guide" }],
          type: "link",
          url: "https://example.com/path",
        },
        3,
      ),
      createPositionedNode(
        {
          alt: "Logo",
          type: "image",
          url: "https://example.com/logo.png",
        },
        4,
      ),
      createPositionedNode({ type: "inlineCode", value: "code" }, 5),
      createPositionedNode({ ordered: true, type: "list" }, 6),
      createPositionedNode(
        {
          children: [
            {
              children: [{ type: "tableCell" }, { type: "tableCell" }],
              type: "tableRow",
            },
          ],
          type: "table",
        },
        7,
      ),
      createPositionedNode(
        {
          children: [{ type: "tableCell" }, { type: "tableCell" }],
          type: "tableRow",
        },
        8,
      ),
      createPositionedNode({ type: "text", value: "free-text" }, 9),
      createPositionedNode({ type: "break" }, 10),
      createPositionedNode({ type: "html", value: "<div>same</div>" }, 11),
      createPositionedNode({ type: "footnoteReference" }, 12),
      createPositionedNode({ type: "imageReference" }, 13),
      createPositionedNode({ type: "thematicBreak" }, 14),
      createPositionedNode({ type: "unknown-node" }, 15),
    ]);

    const instanceRoot = createRoot([
      {
        children: [{ type: "text", value: "Title" }],
        depth: 2,
        type: "heading",
      },
      { lang: "ts", type: "code", value: "value" },
      {
        children: [{ type: "text", value: "Guide" }],
        type: "link",
        url: "https://example.com/path",
      },
      {
        alt: "Logo",
        type: "image",
        url: "https://example.com/logo.png",
      },
      { type: "inlineCode", value: "code" },
      { ordered: true, type: "list" },
      {
        children: [
          {
            children: [{ type: "tableCell" }, { type: "tableCell" }],
            type: "tableRow",
          },
        ],
        type: "table",
      },
      {
        children: [{ type: "tableCell" }, { type: "tableCell" }],
        type: "tableRow",
      },
      { type: "text", value: "free-text" },
      { type: "break" },
      { type: "html", value: "<div>same</div>" },
      { type: "footnoteReference" },
      { type: "imageReference" },
      { type: "thematicBreak" },
      { type: "unknown-node" },
    ]);

    vi.doMock("remark", () => {
      const processor = {
        parse: vi
          .fn<(markdown: string) => unknown>()
          .mockReturnValueOnce(templateRoot)
          .mockReturnValueOnce(instanceRoot),
        use: vi.fn<() => unknown>().mockReturnThis(),
      };

      return {
        remark: () => processor,
      };
    });

    vi.doMock("remark-gfm", () => ({
      default: {},
    }));

    const importedModule = await import("./validator-markdown.service");
    const syntheticService = new importedModule.ValidatorMarkdownService(
      new ValidatorTemplateService(),
    );

    const result = syntheticService.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "instance",
      template: "template",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe('Expected unknown-node: ""');
  });

  it("covers every service error message builder path via synthetic markdown nodes", async () => {
    const templateRoot = createRoot([
      createPositionedNode({ type: "blockquote", value: "quote" }, 1),
      createPositionedNode({ type: "break", value: "" }, 2),
      createPositionedNode({ lang: "ts", type: "code", value: "value" }, 3),
      createPositionedNode({ type: "definition", value: "def" }, 4),
      createPositionedNode({ type: "delete", value: "strike" }, 5),
      createPositionedNode({ type: "emphasis", value: "em" }, 6),
      createPositionedNode({ type: "footnoteDefinition", value: "foot" }, 7),
      createPositionedNode({ type: "footnoteReference", value: "foot" }, 8),
      createPositionedNode(
        {
          children: [{ type: "text", value: "Heading" }],
          depth: 2,
          type: "heading",
        },
        9,
      ),
      createPositionedNode({ type: "html", value: "<div>html</div>" }, 10),
      createPositionedNode(
        { alt: "Logo", type: "image", url: "https://example.com/logo.png" },
        11,
      ),
      createPositionedNode({ type: "imageReference", value: "logo" }, 12),
      createPositionedNode({ type: "inlineCode", value: "inline" }, 13),
      createPositionedNode({ type: "inlineMath", value: "x+y" }, 14),
      createPositionedNode(
        {
          children: [{ type: "text", value: "Guide" }],
          type: "link",
          url: "https://example.com/guide",
        },
        15,
      ),
      createPositionedNode({ type: "linkReference", value: "guide" }, 16),
      createPositionedNode({ ordered: true, type: "list" }, 17),
      createPositionedNode({ type: "listItem", value: "item" }, 18),
      createPositionedNode({ type: "math", value: "x^2" }, 19),
      createPositionedNode({ type: "paragraph", value: "paragraph" }, 20),
      createPositionedNode({ type: "strong", value: "bold" }, 21),
      createPositionedNode({ type: "table" }, 22),
      createPositionedNode({ type: "tableCell", value: "cell" }, 23),
      createPositionedNode({ type: "tableRow", value: "row" }, 24),
      createPositionedNode({ type: "text", value: "text" }, 25),
      createPositionedNode({ type: "thematicBreak", value: "" }, 26),
      createPositionedNode({ type: "yaml", value: "key: value" }, 27),
    ]);

    vi.doMock("remark", () => {
      const processor = {
        parse: vi
          .fn<(markdown: string) => unknown>()
          .mockReturnValueOnce(templateRoot)
          .mockReturnValueOnce(createRoot([])),
        use: vi.fn<() => unknown>().mockReturnThis(),
      };

      return {
        remark: () => processor,
      };
    });

    vi.doMock("remark-gfm", () => ({
      default: {},
    }));

    const importedModule = await import("./validator-markdown.service");
    const syntheticService = new importedModule.ValidatorMarkdownService(
      new ValidatorTemplateService(),
    );

    const result = syntheticService.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "instance",
      template: "template",
    });

    expect(result.errors.length).toBeGreaterThanOrEqual(20);
    expect(
      result.errors.some((error) => error.message.includes("Expected image")),
    ).toBe(true);
    expect(
      result.errors.some((error) =>
        error.message.includes("Expected inline code"),
      ),
    ).toBe(true);
    expect(
      result.errors.some((error) =>
        error.message.includes("Expected thematic break"),
      ),
    ).toBe(true);
  });

  it("covers pickBestCandidate empty-candidates throw branch", async () => {
    const importedModule = await import("./validator-markdown.service");
    const syntheticService = new importedModule.ValidatorMarkdownService(
      new ValidatorTemplateService(),
    );
    const pickBestCandidate: unknown = Reflect.get(
      syntheticService,
      "pickBestCandidate",
    ) as unknown;

    if (typeof pickBestCandidate !== "function") {
      throw new TypeError("Expected pickBestCandidate to be a function");
    }

    type PickBestCandidate = (
      templateGrandchildren: readonly MdastNode[],
      candidates: readonly MdastNode[],
    ) => { bestCandidate: MdastNode; minimumErrors: unknown[] };

    const isPickBestCandidate = (value: unknown): value is PickBestCandidate =>
      typeof value === "function";

    if (!isPickBestCandidate(pickBestCandidate)) {
      throw new TypeError(
        "Expected pickBestCandidate to match PickBestCandidate",
      );
    }

    expect(() => pickBestCandidate([], [])).toThrow(
      "candidates must not be empty",
    );
  });
});
