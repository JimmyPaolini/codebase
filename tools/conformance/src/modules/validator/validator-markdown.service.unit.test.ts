import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ValidatorMarkdownService } from "./validator-markdown.service";
import { ValidatorTemplateService } from "./validator-template.service";

describe(ValidatorMarkdownService, () => {
  let service: ValidatorMarkdownService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ValidatorMarkdownService, ValidatorTemplateService],
    }).compile();

    service = await module.resolve(ValidatorMarkdownService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("accepts a structural superset with extra markdown around the template", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: [
        "Intro paragraph.",
        "",
        "# Extra heading",
        "",
        "# Title",
        "",
        "Paragraph with [link](https://example.com), ![alt](https://example.com/image.png), and `inline`.",
        "",
        "> Quote",
        "",
        "- item",
        "",
        "```ts",
        'console.log("hello");',
        "```",
        "",
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
        "",
        "Tail paragraph.",
      ].join("\n"),
      template: [
        "# Title",
        "",
        "Paragraph with [link](https://example.com), ![alt](https://example.com/image.png), and `inline`.",
        "",
        "> Quote",
        "",
        "- item",
        "",
        "```ts",
        'console.log("hello");',
        "```",
        "",
        "| A | B |",
        "| - | - |",
        "| 1 | 2 |",
      ].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports a missing code block with location metadata", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Intro paragraph.",
      template: [
        "Intro paragraph.",
        "",
        "```ts",
        'console.log("hello");',
        "```",
      ].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      errorType: "code",
      language: "markdown",
      message: 'Expected code block (ts): "console.log("hello");"',
      templateLine: 3,
    });
    expect(result.errors[0]?.instanceLine).toBe(2);
    expect(result.errors[0]?.instanceColumn).toBe(1);
  });

  it("chooses the best matching container candidate", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["- [alpha](https://example.com)", "- alpha"].join("\n"),
      template: ["- [alpha](https://example.com)"].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports first missing node without instance location hint", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Different content.",
      template: "# Required heading",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      errorType: "code",
      language: "markdown",
      message: 'Expected heading (h1): "Required heading"',
      templateLine: 1,
    });
    expect(result.errors[0]?.instanceLine).toBeUndefined();
    expect(result.errors[0]?.instanceColumn).toBeUndefined();
  });

  it("reports HTML block mismatches", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "<div>instance</div>",
      template: "<div>template</div>",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected HTML block: "<div>template</div>"',
    );
  });

  it("reports ordered and unordered list mismatches", () => {
    const orderedTemplateResult = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "- one",
      template: "1. one",
    });

    expect(orderedTemplateResult.errors).toHaveLength(1);
    expect(orderedTemplateResult.errors[0]?.message).toBe(
      "Expected ordered list",
    );

    const unorderedTemplateResult = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "1. one",
      template: "- one",
    });

    expect(unorderedTemplateResult.errors).toHaveLength(1);
    expect(unorderedTemplateResult.errors[0]?.message).toBe(
      "Expected unordered list",
    );
  });

  it("reports table column-count mismatches", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["| A |", "| - |", "| 1 |"].join("\n"),
      template: ["| A | B |", "| - | - |", "| 1 | 2 |"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("Expected table");
  });

  it("reports heading depth and code language mismatches", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["# Same title", "", "```js", "value", "```"].join("\n"),
      template: ["## Same title", "", "```ts", "value", "```"].join("\n"),
    });

    expect(result.errors).toHaveLength(2);
    expect(result.errors).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: 'Expected heading (h2): "Same title"',
        }),
        expect.objectContaining({
          message: 'Expected code block (ts): "value"',
        }),
      ]),
    );
  });

  it("treats missing footnote references as normalized content", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["Use this claim.", "", "[^1]: Source note."].join("\n"),
      template: ["Use this claim[^1].", "", "[^1]: Source note."].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports combined paragraph and footnote-definition differences", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Use this claim[^1].",
      template: ["Use this claim[^1].", "", "[^1]: Source note."].join("\n"),
    });

    expect(result.errors).toHaveLength(2);

    const messages = result.errors.map((error) => error.message);

    expect(
      messages.some((message) =>
        message.includes("Expected footnoteDefinition"),
      ),
    ).toBe(true);
    expect(
      messages.some((message) => message.includes("Expected paragraph")),
    ).toBe(true);
  });

  it("treats missing link references as normalized content", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["See Guide.", "", "[guide]: https://example.com/guide"].join(
        "\n",
      ),
      template: [
        "See [Guide][guide].",
        "",
        "[guide]: https://example.com/guide",
      ].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports paragraph mismatch for image reference content changes", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["Logo image", "", "[logo]: https://example.com/logo.png"].join(
        "\n",
      ),
      template: [
        "![Logo][logo]",
        "",
        "[logo]: https://example.com/logo.png",
      ].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe('Expected paragraph: "Logo"');
  });

  it("reports paragraph mismatch when hard line breaks are collapsed", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "first line second line",
      template: ["first line  ", "second line"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected paragraph: "first linesecond line"',
    );
  });

  it("accepts thematic breaks matched by node type", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["---", "", "Content"].join("\n"),
      template: ["---", "", "Content"].join("\n"),
    });

    expect(result.errors).toStrictEqual([]);
  });

  it("reports missing inline code in paragraph content", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Use plain text only.",
      template: "Use `inline` only.",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected paragraph: "Use inline only."',
    );
  });

  it("reports missing image references when reference definition is absent", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "![Logo][logo]",
      template: [
        "![Logo][logo]",
        "",
        "[logo]: https://example.com/logo.png",
      ].join("\n"),
    });

    expect(result.errors.length).toBeGreaterThanOrEqual(1);

    const messages = result.errors.map((error) => error.message);

    expect(
      messages.some((message) => message.includes("Expected definition:")),
    ).toBe(true);
  });

  it("reports nested list item mismatches", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["- one", "  - child-a"].join("\n"),
      template: ["- one", "  - child-b"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain(
      'Expected list item: "onechild-b"',
    );
  });

  it("reports inline HTML differences inside paragraphs", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "<span>instance</span>",
      template: "<span>template</span>",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected paragraph: "<span>template</span>"',
    );
  });

  it("reports missing table rows when template has additional rows", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["| A |", "| - |", "| 1 |"].join("\n"),
      template: ["| A |", "| - |", "| 1 |", "| 2 |"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("Expected table cell");
  });

  it("reports missing thematic breaks", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Section A\n\nSection B",
      template: "Section A\n\n---\n\nSection B",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe("Expected thematic break (---)");
  });

  it("reports missing blockquotes with location hint metadata", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "Intro paragraph.",
      template: ["Intro paragraph.", "", "> Required quote"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({
      message: 'Expected blockquote: "Required quote"',
      templateLine: 3,
    });
    expect(result.errors[0]?.instanceLine).toBe(2);
    expect(result.errors[0]?.instanceColumn).toBe(1);
  });

  it("reports missing root definitions with exact message", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "",
      template: "[guide]: https://example.com/guide",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe('Expected definition: ""');
    expect(result.errors[0]?.templateLine).toBe(1);
    expect(result.errors[0]?.instanceLine).toBeUndefined();
  });

  it("reports missing footnote definitions with exact message", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: "",
      template: "[^note]: citation text",
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected footnoteDefinition: "citation text"',
    );
    expect(result.errors[0]?.templateLine).toBe(1);
  });

  it("reports code value mismatch when language matches", () => {
    const result = service.validateMarkdownConformance({
      data: {},
      filename: "example.md",
      instance: ["```ts", "instance", "```"].join("\n"),
      template: ["```ts", "template", "```"].join("\n"),
    });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toBe(
      'Expected code block (ts): "template"',
    );
  });

  it("covers uncommon markdown message and matcher handlers", () => {
    interface MarkdownHandlerNode {
      alt?: string;
      depth?: number;
      lang?: string;
      ordered?: boolean;
      title?: string;
      type: string;
      url?: string;
      value?: string;
    }

    type ErrorMessageBuilder = (node: MarkdownHandlerNode) => string;
    type NodeMatcher = (
      templateNode: MarkdownHandlerNode,
      instanceNode: MarkdownHandlerNode,
    ) => boolean;

    const isErrorMessageBuilderRecord = (
      value: unknown,
    ): value is Readonly<Record<string, ErrorMessageBuilder>> => {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      // type-coverage:ignore-next-line
      for (const entry of Object.values(value)) {
        // type-coverage:ignore-next-line
        if (typeof entry !== "function") {
          return false;
        }
      }

      return true;
    };

    const isNodeMatcherRecord = (
      value: unknown,
    ): value is Readonly<Record<string, NodeMatcher>> => {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      // type-coverage:ignore-next-line
      for (const entry of Object.values(value)) {
        // type-coverage:ignore-next-line
        if (typeof entry !== "function") {
          return false;
        }
      }

      return true;
    };

    const errorMessageBuildersValue: unknown = Reflect.get(
      service,
      "errorMessageBuilders",
    ) as unknown;
    const nodeMatchersValue: unknown = Reflect.get(
      service,
      "nodeMatchers",
    ) as unknown;

    if (!isErrorMessageBuilderRecord(errorMessageBuildersValue)) {
      throw new TypeError("Expected errorMessageBuilders to be an object");
    }

    if (!isNodeMatcherRecord(nodeMatchersValue)) {
      throw new TypeError("Expected nodeMatchers to be an object");
    }

    const errorMessageBuilders = errorMessageBuildersValue;
    const nodeMatchers = nodeMatchersValue;

    const builderNode: MarkdownHandlerNode = {
      alt: "alt",
      depth: 2,
      lang: "ts",
      ordered: true,
      title: "title",
      type: "text",
      url: "https://example.com",
      value: "value",
    };

    const builderKeys = [
      "break",
      "delete",
      "footnoteReference",
      "html",
      "image",
      "imageReference",
      "inlineMath",
      "link",
      "linkReference",
      "math",
      "table",
      "tableCell",
      "tableRow",
      "thematicBreak",
      "text",
      "yaml",
    ];

    for (const builderKey of builderKeys) {
      const messageBuilder = errorMessageBuilders[builderKey];

      expect(typeof messageBuilder).toBe("function");

      if (typeof messageBuilder !== "function") {
        throw new TypeError(`Missing message builder for ${builderKey}`);
      }

      expect(messageBuilder(builderNode)).toBeTypeOf("string");
    }

    const getNodeMatcher = (
      matcherKey: keyof typeof nodeMatchers,
    ): NonNullable<(typeof nodeMatchers)[typeof matcherKey]> => {
      const nodeMatcher = nodeMatchers[matcherKey];

      expect(typeof nodeMatcher).toBe("function");

      if (typeof nodeMatcher !== "function") {
        throw new TypeError(`Missing node matcher for ${matcherKey}`);
      }

      return nodeMatcher;
    };

    const imageMatcher = getNodeMatcher("image");
    const inlineCodeMatcher = getNodeMatcher("inlineCode");
    const linkMatcher = getNodeMatcher("link");
    const textMatcher = getNodeMatcher("text");
    const deleteMatcher = getNodeMatcher("delete");
    const emphasisMatcher = getNodeMatcher("emphasis");
    const inlineMathMatcher = getNodeMatcher("inlineMath");
    const linkReferenceMatcher = getNodeMatcher("linkReference");
    const mathMatcher = getNodeMatcher("math");
    const strongMatcher = getNodeMatcher("strong");
    const tableMatcher = getNodeMatcher("table");
    const yamlMatcher = getNodeMatcher("yaml");

    expect(
      imageMatcher(
        { ...builderNode, type: "image" },
        { ...builderNode, type: "image" },
      ),
    ).toBe(true);
    expect(
      inlineCodeMatcher(
        { ...builderNode, type: "inlineCode" },
        { ...builderNode, type: "inlineCode" },
      ),
    ).toBe(true);
    expect(
      linkMatcher(
        { ...builderNode, type: "link" },
        { ...builderNode, type: "link" },
      ),
    ).toBe(true);
    expect(
      textMatcher(
        { ...builderNode, type: "text" },
        { ...builderNode, type: "text" },
      ),
    ).toBe(true);
    expect(
      deleteMatcher(
        { ...builderNode, type: "delete" },
        { ...builderNode, type: "delete" },
      ),
    ).toBe(true);
    expect(
      emphasisMatcher(
        { ...builderNode, type: "emphasis" },
        { ...builderNode, type: "emphasis" },
      ),
    ).toBe(true);
    expect(
      inlineMathMatcher(
        { ...builderNode, type: "inlineMath" },
        { ...builderNode, type: "inlineMath" },
      ),
    ).toBe(true);
    expect(
      linkReferenceMatcher(
        { ...builderNode, type: "linkReference" },
        { ...builderNode, type: "linkReference" },
      ),
    ).toBe(true);
    expect(
      mathMatcher(
        { ...builderNode, type: "math" },
        { ...builderNode, type: "math" },
      ),
    ).toBe(true);
    expect(
      strongMatcher(
        { ...builderNode, type: "strong" },
        { ...builderNode, type: "strong" },
      ),
    ).toBe(true);
    expect(
      yamlMatcher(
        { ...builderNode, type: "yaml" },
        { ...builderNode, type: "yaml" },
      ),
    ).toBe(true);
    expect(imageMatcher({ type: "image" }, { type: "image" })).toBe(true);
    expect(tableMatcher({ type: "table" }, { type: "table" })).toBe(true);
    expect(textMatcher({ type: "text" }, { type: "text" })).toBe(true);
  });
});
