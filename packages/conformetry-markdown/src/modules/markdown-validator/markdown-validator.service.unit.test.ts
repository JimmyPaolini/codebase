import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { MarkdownValidatorService } from "./markdown-validator.service";

import type {
  MarkdownAbstractSyntaxTreeNode,
  PickBestCandidateArguments,
  ProcessNodeArguments,
  ProcessNodeResult,
  ValidateMarkdownChildrenArguments,
  ValidateMarkdownDocumentArguments,
  ValidatePathExistenceArguments,
} from "./markdown-validator.types";

interface MarkdownValidatorServiceHarness {
  buildMissingNodeMessage: (
    templateNode: MarkdownAbstractSyntaxTreeNode,
    instanceHint: MarkdownAbstractSyntaxTreeNode | undefined,
  ) => string;
  filterMarkdownNodes: (
    children: readonly unknown[],
  ) => MarkdownAbstractSyntaxTreeNode[];
  getNodeChildren: (
    node: MarkdownAbstractSyntaxTreeNode,
  ) => MarkdownAbstractSyntaxTreeNode[];
  nodesMatch: (
    templateNode: MarkdownAbstractSyntaxTreeNode,
    instanceNode: MarkdownAbstractSyntaxTreeNode,
  ) => boolean;
  pathExists: (pathName: string) => Promise<boolean>;
  pickBestCandidate: (arguments_: PickBestCandidateArguments) => {
    readonly bestCandidate: MarkdownAbstractSyntaxTreeNode;
    readonly minimumViolations: string[];
  };
  processContainerNode: (arguments_: ProcessNodeArguments) => ProcessNodeResult;
  processLeafNode: (arguments_: ProcessNodeArguments) => ProcessNodeResult;
  validateMarkdownChildren: (
    arguments_: ValidateMarkdownChildrenArguments,
  ) => string[];
  validateMarkdownDocument: (
    arguments_: ValidateMarkdownDocumentArguments,
  ) => string[];
  validatePathExistence: (
    arguments_: ValidatePathExistenceArguments,
  ) => Promise<string[]>;
}

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

describe(MarkdownValidatorService, () => {
  const createHarness = (): MarkdownValidatorServiceHarness => {
    // type-coverage:ignore-next-line
    return new MarkdownValidatorService() as unknown as MarkdownValidatorServiceHarness;
  };

  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("reports heading-depth AST deviations even when heading text is unchanged", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance: "## Overview\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Overview\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: [],
    });

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/README.md: Missing markdown heading: "Overview" (template: templates/README.md)',
    );
  });

  it("allows additional markdown nodes when template nodes are still present", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance:
            "# Overview\n\nCore content.\n\n## Additional Details\n\nSupplemental content.\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Overview\n\nCore content.\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: [],
    });

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      workingDirectory: process.cwd(),
    });

    expect(result.ok).toBe(true);
    expect(result.violations).toStrictEqual([]);
  });

  it("reports missing paths when configuration path is undefined", async () => {
    const workingDirectory = await mkdtemp(
      path.join(os.tmpdir(), "markdown-validator-paths-"),
    );
    const existingFilePath = path.join(workingDirectory, "existing.md");
    await writeFile(existingFilePath, "# Existing\n");

    const markdownValidatorService = new MarkdownValidatorService();
    const result = await markdownValidatorService.validate({
      filePaths: ["existing.md", "missing.md"],
      workingDirectory,
    });

    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual([
      `Missing Markdown path ${path.join(workingDirectory, "missing.md")}`,
    ]);
    expect(result.pluginName).toBe("markdown");
    expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
  });

  it("returns success when every requested markdown path exists", async () => {
    const workingDirectory = await mkdtemp(
      path.join(os.tmpdir(), "markdown-validator-paths-"),
    );
    await mkdir(path.join(workingDirectory, "documentation"), {
      recursive: true,
    });
    await writeFile(
      path.join(workingDirectory, "documentation/readme.md"),
      "# A\n",
    );
    await writeFile(
      path.join(workingDirectory, "documentation/changelog.md"),
      "# B\n",
    );

    const markdownValidatorService = new MarkdownValidatorService();
    const result = await markdownValidatorService.validate({
      filePaths: ["documentation/readme.md", "documentation/changelog.md"],
      workingDirectory,
    });

    expect(result).toStrictEqual({
      checkedPaths: ["documentation/readme.md", "documentation/changelog.md"],
      ok: true,
      pluginName: "markdown",
      violations: [],
    });
  });

  it("aggregates document issues and payload issues when template validation is requested", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance: "## Heading\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Heading\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: ["template metadata violation"],
    });

    const markdownValidatorService = new MarkdownValidatorService();
    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      templateRuleNames: ["markdown-template"],
      workingDirectory: process.cwd(),
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".md"],
      filePaths: ["src/README.md"],
      templateRuleNames: ["markdown-template"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain(
      'src/README.md: Missing markdown heading: "Heading" (template: templates/README.md)',
    );
    expect(result.violations).toContain("template metadata violation");
  });

  it("supports markdown node matching and helper branches", () => {
    const markdownValidatorService = createHarness();

    expect(
      markdownValidatorService.nodesMatch(
        { children: [{ type: "text", value: "A" }], type: "paragraph" },
        { children: [{ type: "text", value: "A" }], type: "heading" },
      ),
    ).toBe(false);

    expect(
      markdownValidatorService.nodesMatch(
        { lang: "ts", type: "code", value: "const a = 1;" },
        { lang: "ts", type: "code", value: "const a = 1;" },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { lang: "ts", type: "code", value: "const a = 1;" },
        { lang: "js", type: "code", value: "const a = 1;" },
      ),
    ).toBe(false);
    expect(
      markdownValidatorService.nodesMatch({ type: "code" }, { type: "code" }),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { type: "code", value: "a" },
        { type: "code" },
      ),
    ).toBe(false);

    expect(
      markdownValidatorService.nodesMatch(
        {
          children: [{ type: "text", value: "Title" }],
          depth: 2,
          type: "heading",
        },
        {
          children: [{ type: "text", value: "Title" }],
          depth: 2,
          type: "heading",
        },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        {
          children: [{ type: "text", value: "Title" }],
          depth: 2,
          type: "heading",
        },
        {
          children: [{ type: "text", value: "Title" }],
          depth: 3,
          type: "heading",
        },
      ),
    ).toBe(false);

    expect(
      markdownValidatorService.nodesMatch(
        { type: "inlineCode", value: "x" },
        { type: "inlineCode", value: "x" },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch({ type: "html" }, { type: "html" }),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { type: "text", value: "value" },
        { type: "text" },
      ),
    ).toBe(false);
    expect(
      markdownValidatorService.nodesMatch(
        { alt: "caption", type: "image", url: "image.png" },
        { alt: "caption", type: "image", url: "image.png" },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { alt: "caption", type: "image", url: "image.png" },
        { alt: "other caption", type: "image", url: "image.png" },
      ),
    ).toBe(false);
    expect(
      markdownValidatorService.nodesMatch({ type: "image" }, { type: "image" }),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { type: "image", url: "image.png" },
        { type: "image" },
      ),
    ).toBe(false);

    expect(
      markdownValidatorService.nodesMatch(
        {
          children: [{ type: "text", value: "Docs" }],
          type: "link",
          url: "/docs",
        },
        {
          children: [{ type: "text", value: "Docs" }],
          type: "link",
          url: "/docs",
        },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { children: [{ type: "text", value: "Docs" }], type: "link" },
        { children: [{ type: "text", value: "Docs" }], type: "link" },
      ),
    ).toBe(true);

    expect(
      markdownValidatorService.nodesMatch(
        { ordered: true, type: "list" },
        { ordered: true, type: "list" },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        { ordered: true, type: "list" },
        { ordered: false, type: "list" },
      ),
    ).toBe(false);

    expect(
      markdownValidatorService.nodesMatch(
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
          children: [
            {
              children: [{ type: "tableCell" }, { type: "tableCell" }],
              type: "tableRow",
            },
          ],
          type: "table",
        },
      ),
    ).toBe(true);
    expect(
      markdownValidatorService.nodesMatch(
        {
          children: [
            {
              children: [{ type: "tableCell" }],
              type: "tableRow",
            },
          ],
          type: "table",
        },
        {
          children: [
            {
              children: [{ type: "tableCell" }, { type: "tableCell" }],
              type: "tableRow",
            },
          ],
          type: "table",
        },
      ),
    ).toBe(false);
    expect(
      markdownValidatorService.nodesMatch({ type: "table" }, { type: "table" }),
    ).toBe(true);

    expect(
      markdownValidatorService.nodesMatch(
        {
          children: [{ type: "tableCell" }, { type: "tableCell" }],
          type: "tableRow",
        },
        { children: [{ type: "tableCell" }], type: "tableRow" },
      ),
    ).toBe(false);
    expect(
      markdownValidatorService.nodesMatch(
        { type: "thematicBreak" },
        { type: "thematicBreak" },
      ),
    ).toBe(true);

    expect(
      markdownValidatorService.nodesMatch(
        { children: [{ type: "text", value: "Same text" }], type: "paragraph" },
        { children: [{ type: "text", value: "Same text" }], type: "paragraph" },
      ),
    ).toBe(true);
  });

  it("selects the best container candidate and handles candidate edge-cases", () => {
    const markdownValidatorService = createHarness();

    expect(() => {
      markdownValidatorService.pickBestCandidate({
        candidates: [],
        templateGrandchildren: [],
      });
    }).toThrow("Expected at least one markdown candidate.");

    const firstCandidate: MarkdownAbstractSyntaxTreeNode = {
      children: [
        { children: [{ type: "text", value: "Mismatch" }], type: "paragraph" },
      ],
      type: "listItem",
    };
    const secondCandidate: MarkdownAbstractSyntaxTreeNode = {
      children: [
        { children: [{ type: "text", value: "Exact" }], type: "paragraph" },
      ],
      type: "listItem",
    };
    const thirdCandidate: MarkdownAbstractSyntaxTreeNode = {
      children: [
        { children: [{ type: "text", value: "Exact" }], type: "paragraph" },
      ],
      type: "listItem",
    };
    const bestCandidate = markdownValidatorService.pickBestCandidate({
      candidates: [firstCandidate, secondCandidate, thirdCandidate],
      templateGrandchildren: [
        { children: [{ type: "text", value: "Exact" }], type: "paragraph" },
      ],
    });

    expect(bestCandidate.bestCandidate).toBe(secondCandidate);
    expect(bestCandidate.minimumViolations).toStrictEqual([]);

    const containerMissingMatch = markdownValidatorService.processContainerNode(
      {
        instanceChildren: [],
        lastMatchedInstanceNode: undefined,
        templateChild: {
          children: [{ type: "text", value: "A" }],
          type: "listItem",
        },
      },
    );

    expect(containerMissingMatch.violations).toHaveLength(1);

    const containerWithoutGrandchildren =
      markdownValidatorService.processContainerNode({
        instanceChildren: [{ type: "listItem" }, { type: "listItem" }],
        lastMatchedInstanceNode: undefined,
        templateChild: { type: "listItem" },
      });

    expect(containerWithoutGrandchildren.violations).toStrictEqual([]);
    expect(containerWithoutGrandchildren.lastMatched).toStrictEqual({
      type: "listItem",
    });

    const containerWithGrandchildren =
      markdownValidatorService.processContainerNode({
        instanceChildren: [firstCandidate, secondCandidate],
        lastMatchedInstanceNode: undefined,
        templateChild: {
          children: [
            { children: [{ type: "text", value: "Exact" }], type: "paragraph" },
          ],
          type: "listItem",
        },
      });

    expect(containerWithGrandchildren.violations).toStrictEqual([]);
    expect(containerWithGrandchildren.lastMatched).toBe(secondCandidate);
  });

  it("processes leaf nodes and markdown child validation paths", () => {
    const markdownValidatorService = createHarness();

    const missingLeafResult = markdownValidatorService.processLeafNode({
      instanceChildren: [{ children: [], depth: 2, type: "heading" }],
      lastMatchedInstanceNode: undefined,
      templateChild: { children: [], depth: 1, type: "heading" },
    });

    expect(missingLeafResult.violations).toHaveLength(1);

    const matchingLeaf = { children: [], depth: 2, type: "heading" };
    const matchingLeafResult = markdownValidatorService.processLeafNode({
      instanceChildren: [matchingLeaf],
      lastMatchedInstanceNode: undefined,
      templateChild: matchingLeaf,
    });

    expect(matchingLeafResult.violations).toStrictEqual([]);
    expect(matchingLeafResult.lastMatched).toBe(matchingLeaf);

    const markdownViolations =
      markdownValidatorService.validateMarkdownChildren({
        instanceChildren: [
          { children: [{ type: "text", value: "Body" }], type: "paragraph" },
        ],
        templateChildren: [
          { type: "text", value: "Ignored text node" },
          { children: [{ type: "text", value: "Body" }], type: "paragraph" },
        ],
      });

    expect(markdownViolations).toStrictEqual([]);
  });

  it("parses markdown documents through remark and returns structural violations", () => {
    const markdownValidatorService = createHarness();

    const violations = markdownValidatorService.validateMarkdownDocument({
      instance: "# Heading\n\nParagraph\n\n- Item one\n",
      renderedTemplate:
        "# Heading\n\nParagraph\n\n- Item one\n\n| Column |\n| --- |\n| Value |\n",
    });

    expect(violations).toHaveLength(1);
    expect(violations[0]).toMatch(/^Missing markdown table: ".+"/);
    expect(violations[0]).toContain("near instance line");
  });

  it("formats missing-node messages and low-level helpers consistently", async () => {
    const markdownValidatorService = createHarness();
    const messageWithoutHint = markdownValidatorService.buildMissingNodeMessage(
      { children: [{ type: "text", value: "Overview" }], type: "heading" },
      undefined,
    );

    expect(messageWithoutHint).toBe('Missing markdown heading: "Overview"');

    const messageWithHint = markdownValidatorService.buildMissingNodeMessage(
      { children: [{ type: "text", value: "Overview" }], type: "heading" },
      {
        children: [{ type: "text", value: "Current" }],
        position: { end: { line: 9 } },
        type: "heading",
      },
    );

    expect(messageWithHint).toBe(
      'Missing markdown heading: "Overview" near instance line 10',
    );

    const nodes = markdownValidatorService.filterMarkdownNodes([
      null,
      "text",
      { value: "missing type" },
      { type: "paragraph" },
    ]);

    expect(nodes).toStrictEqual([{ type: "paragraph" }]);
    expect(
      markdownValidatorService.getNodeChildren({ type: "paragraph" }),
    ).toStrictEqual([]);

    const workingDirectory = await mkdtemp(
      path.join(os.tmpdir(), "markdown-validator-helpers-"),
    );
    const existingFilePath = path.join(workingDirectory, "existing.md");
    await writeFile(existingFilePath, "## Existing\n");

    await expect(
      markdownValidatorService.pathExists(existingFilePath),
    ).resolves.toBe(true);
    await expect(
      markdownValidatorService.pathExists(
        path.join(workingDirectory, "missing.md"),
      ),
    ).resolves.toBe(false);
    await expect(
      markdownValidatorService.validatePathExistence({
        filePaths: ["existing.md", "missing.md"],
        workingDirectory,
      }),
    ).resolves.toStrictEqual([
      `Missing Markdown path ${path.join(workingDirectory, "missing.md")}`,
    ]);
  });
});
