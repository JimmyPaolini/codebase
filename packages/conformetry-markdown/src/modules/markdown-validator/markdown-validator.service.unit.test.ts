import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR } from "./markdown-validator.constants";
import { MarkdownValidatorService } from "./markdown-validator.service";

import type {
  MarkdownAbstractSyntaxTreeNode,
  PickBestCandidateArguments,
  ProcessNodeArguments,
  ProcessNodeResult,
  ValidateMarkdownChildrenArguments,
} from "./markdown-validator.types";

const { prepareTemplateValidationPayloadMock } = vi.hoisted(() => {
  return {
    prepareTemplateValidationPayloadMock:
      vi.fn<
        (
          arguments_: unknown,
        ) => Promise<{ documents: unknown[]; violations: string[] }>
      >(),
  };
});

vi.mock("@jimmypaolini/conformetry-configuration", () => {
  return {
    prepareTemplateValidationPayload: prepareTemplateValidationPayloadMock,
  };
});

const getFilterMarkdownNodesMethod = (
  service: MarkdownValidatorService,
): ((children: readonly unknown[]) => MarkdownAbstractSyntaxTreeNode[]) => {
  const methodCandidate: unknown = Reflect.get(service, "filterMarkdownNodes");
  if (!isFilterMarkdownNodesMethod(methodCandidate)) {
    throw new TypeError("Expected filterMarkdownNodes to be a function.");
  }

  return (children: readonly unknown[]): MarkdownAbstractSyntaxTreeNode[] => {
    return methodCandidate.call(service, children);
  };
};

const getNodesMatchMethod = (
  service: MarkdownValidatorService,
): ((
  templateNode: MarkdownAbstractSyntaxTreeNode,
  instanceNode: MarkdownAbstractSyntaxTreeNode,
) => boolean) => {
  const methodCandidate: unknown = Reflect.get(service, "nodesMatch");
  if (!isNodesMatchMethod(methodCandidate)) {
    throw new TypeError("Expected nodesMatch to be a function.");
  }

  return (
    templateNode: MarkdownAbstractSyntaxTreeNode,
    instanceNode: MarkdownAbstractSyntaxTreeNode,
  ): boolean => {
    return methodCandidate.call(service, templateNode, instanceNode);
  };
};

const getProcessContainerNodeMethod = (
  service: MarkdownValidatorService,
): ((arguments_: ProcessNodeArguments) => ProcessNodeResult) => {
  const methodCandidate: unknown = Reflect.get(service, "processContainerNode");
  if (!isProcessContainerNodeMethod(methodCandidate)) {
    throw new TypeError("Expected processContainerNode to be a function.");
  }

  return (arguments_: ProcessNodeArguments): ProcessNodeResult => {
    return methodCandidate.call(service, arguments_);
  };
};

const getProcessLeafNodeMethod = (
  service: MarkdownValidatorService,
): ((arguments_: ProcessNodeArguments) => ProcessNodeResult) => {
  const methodCandidate: unknown = Reflect.get(service, "processLeafNode");
  if (!isProcessLeafNodeMethod(methodCandidate)) {
    throw new TypeError("Expected processLeafNode to be a function.");
  }

  return (arguments_: ProcessNodeArguments): ProcessNodeResult => {
    return methodCandidate.call(service, arguments_);
  };
};

const getPickBestCandidateMethod = (
  service: MarkdownValidatorService,
): ((arguments_: PickBestCandidateArguments) => {
  readonly bestCandidate: MarkdownAbstractSyntaxTreeNode;
  readonly minimumViolations: string[];
}) => {
  const methodCandidate: unknown = Reflect.get(service, "pickBestCandidate");
  if (!isPickBestCandidateMethod(methodCandidate)) {
    throw new TypeError("Expected pickBestCandidate to be a function.");
  }

  return (
    arguments_: PickBestCandidateArguments,
  ): {
    readonly bestCandidate: MarkdownAbstractSyntaxTreeNode;
    readonly minimumViolations: string[];
  } => {
    return methodCandidate.call(service, arguments_);
  };
};

const getValidateMarkdownChildrenMethod = (
  service: MarkdownValidatorService,
): ((arguments_: ValidateMarkdownChildrenArguments) => string[]) => {
  const methodCandidate: unknown = Reflect.get(
    service,
    "validateMarkdownChildren",
  );
  if (!isValidateMarkdownChildrenMethod(methodCandidate)) {
    throw new TypeError("Expected validateMarkdownChildren to be a function.");
  }

  return (arguments_: ValidateMarkdownChildrenArguments): string[] => {
    return methodCandidate.call(service, arguments_);
  };
};

const isFilterMarkdownNodesMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  children: readonly unknown[],
) => MarkdownAbstractSyntaxTreeNode[] => {
  return typeof value === "function";
};

const isNodesMatchMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  templateNode: MarkdownAbstractSyntaxTreeNode,
  instanceNode: MarkdownAbstractSyntaxTreeNode,
) => boolean => {
  return typeof value === "function";
};

const isProcessContainerNodeMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  arguments_: ProcessNodeArguments,
) => ProcessNodeResult => {
  return typeof value === "function";
};

const isProcessLeafNodeMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  arguments_: ProcessNodeArguments,
) => ProcessNodeResult => {
  return typeof value === "function";
};

const isPickBestCandidateMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  arguments_: PickBestCandidateArguments,
) => {
  readonly bestCandidate: MarkdownAbstractSyntaxTreeNode;
  readonly minimumViolations: string[];
} => {
  return typeof value === "function";
};

const isValidateMarkdownChildrenMethod = (
  value: unknown,
): value is (
  this: MarkdownValidatorService,
  arguments_: ValidateMarkdownChildrenArguments,
) => string[] => {
  return typeof value === "function";
};

const createNode = (
  type: string,
  overrides: Partial<MarkdownAbstractSyntaxTreeNode> = {},
): MarkdownAbstractSyntaxTreeNode => {
  return {
    type,
    ...overrides,
  };
};

describe(MarkdownValidatorService, () => {
  beforeEach(() => {
    prepareTemplateValidationPayloadMock.mockReset();
  });

  it("exposes the markdown plugin descriptor", () => {
    const markdownValidatorService = new MarkdownValidatorService();

    expect(markdownValidatorService.pluginDescriptor).toStrictEqual(
      MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR,
    );
  });

  it("filters markdown nodes and ignores invalid children", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const filterMarkdownNodes = getFilterMarkdownNodesMethod(
      markdownValidatorService,
    );

    const filteredNodes = filterMarkdownNodes([
      createNode("paragraph"),
      null,
      "not-a-node",
      { value: "missing-type" },
      createNode("heading", { depth: 1 }),
    ]);

    expect(filteredNodes).toStrictEqual([
      createNode("paragraph"),
      createNode("heading", { depth: 1 }),
    ]);
  });

  it("matches markdown leaf and container node variants", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const nodesMatch = getNodesMatchMethod(markdownValidatorService);

    expect(
      nodesMatch(
        createNode("code", { lang: "ts", value: "const value = 1;" }),
        createNode("code", { lang: "ts", value: "const value = 1;" }),
      ),
    ).toBe(true);
    expect(nodesMatch(createNode("code"), createNode("code"))).toBe(true);
    expect(
      nodesMatch(
        createNode("code", { value: "const value = 1;" }),
        createNode("code", { value: "const value = 1;" }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("heading", {
          children: [createNode("text", { value: "Overview" })],
          depth: 2,
        }),
        createNode("heading", {
          children: [createNode("text", { value: "Overview" })],
          depth: 2,
        }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("html", { value: "<br />" }),
        createNode("html", { value: "<br />" }),
      ),
    ).toBe(true);
    expect(nodesMatch(createNode("html"), createNode("html"))).toBe(true);
    expect(
      nodesMatch(
        createNode("inlineCode", { value: "command" }),
        createNode("inlineCode", { value: "command" }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("text", { value: "content" }),
        createNode("text", { value: "content" }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("image", { alt: "preview", url: "/preview.png" }),
        createNode("image", { alt: "preview", url: "/preview.png" }),
      ),
    ).toBe(true);
    expect(nodesMatch(createNode("image"), createNode("image"))).toBe(true);
    expect(
      nodesMatch(
        createNode("link", {
          children: [createNode("text", { value: "Reference" })],
          url: "/reference",
        }),
        createNode("link", {
          children: [createNode("text", { value: "Reference" })],
          url: "/reference",
        }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("link", {
          children: [createNode("text", { value: "Reference" })],
        }),
        createNode("link", {
          children: [createNode("text", { value: "Reference" })],
        }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("list", { ordered: true }),
        createNode("list", { ordered: true }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("table", {
          children: [
            createNode("tableRow", { children: [createNode("tableCell")] }),
          ],
        }),
        createNode("table", {
          children: [
            createNode("tableRow", { children: [createNode("tableCell")] }),
          ],
        }),
      ),
    ).toBe(true);
    expect(nodesMatch(createNode("table"), createNode("table"))).toBe(true);
    expect(
      nodesMatch(
        createNode("tableRow", { children: [createNode("tableCell")] }),
        createNode("tableRow", { children: [createNode("tableCell")] }),
      ),
    ).toBe(true);
    expect(
      nodesMatch(createNode("thematicBreak"), createNode("thematicBreak")),
    ).toBe(true);
    expect(
      nodesMatch(
        createNode("paragraph", {
          children: [createNode("text", { value: "Paragraph text" })],
        }),
        createNode("paragraph", {
          children: [createNode("text", { value: "Paragraph text" })],
        }),
      ),
    ).toBe(true);
    expect(nodesMatch(createNode("paragraph"), createNode("heading"))).toBe(
      false,
    );
  });

  it("processes container and leaf nodes across matching and missing candidates", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const processContainerNode = getProcessContainerNodeMethod(
      markdownValidatorService,
    );
    const processLeafNode = getProcessLeafNodeMethod(markdownValidatorService);
    const lastMatchedInstanceNode = createNode("heading", {
      children: [createNode("text", { value: "Existing" })],
      position: { end: { line: 11 } },
    });

    const missingContainerResult = processContainerNode({
      instanceChildren: [],
      lastMatchedInstanceNode,
      templateChild: createNode("list", { ordered: true }),
    });

    expect(missingContainerResult).toStrictEqual({
      lastMatched: lastMatchedInstanceNode,
      violations: ['Missing markdown list: "" near instance line 12'],
    });

    const containerWithoutGrandchildren = processContainerNode({
      instanceChildren: [createNode("list", { ordered: true })],
      lastMatchedInstanceNode,
      templateChild: createNode("list", { ordered: true }),
    });

    expect(containerWithoutGrandchildren.violations).toStrictEqual([]);
    expect(containerWithoutGrandchildren.lastMatched).toStrictEqual(
      createNode("list", { ordered: true }),
    );

    const listTemplate = createNode("list", {
      children: [
        createNode("listItem", {
          children: [createNode("text", { value: "Expected item" })],
        }),
      ],
      ordered: false,
    });
    const matchingCandidate = createNode("list", {
      children: [
        createNode("listItem", {
          children: [createNode("text", { value: "Expected item" })],
        }),
      ],
      ordered: false,
    });
    const nonMatchingCandidate = createNode("list", {
      children: [
        createNode("listItem", {
          children: [createNode("text", { value: "Other item" })],
        }),
      ],
      ordered: false,
    });

    const containerWithGrandchildren = processContainerNode({
      instanceChildren: [nonMatchingCandidate, matchingCandidate],
      lastMatchedInstanceNode,
      templateChild: listTemplate,
    });

    expect(containerWithGrandchildren.lastMatched).toStrictEqual(
      matchingCandidate,
    );
    expect(containerWithGrandchildren.violations).toStrictEqual([]);

    const missingLeafResult = processLeafNode({
      instanceChildren: [createNode("heading", { depth: 1 })],
      lastMatchedInstanceNode,
      templateChild: createNode("image", {
        alt: "diagram",
        url: "/diagram.png",
      }),
    });

    expect(missingLeafResult).toStrictEqual({
      lastMatched: lastMatchedInstanceNode,
      violations: ['Missing markdown image: "diagram" near instance line 12'],
    });

    const matchingLeafResult = processLeafNode({
      instanceChildren: [createNode("heading", { depth: 1 })],
      lastMatchedInstanceNode,
      templateChild: createNode("heading", { depth: 1 }),
    });

    expect(matchingLeafResult.violations).toStrictEqual([]);
    expect(matchingLeafResult.lastMatched).toStrictEqual(
      createNode("heading", { depth: 1 }),
    );
  });

  it("throws when picking a best candidate without candidates", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const pickBestCandidate = getPickBestCandidateMethod(
      markdownValidatorService,
    );

    expect(() => {
      pickBestCandidate({
        candidates: [],
        templateGrandchildren: [createNode("paragraph")],
      });
    }).toThrow("Expected at least one markdown candidate.");
  });

  it("keeps the best candidate when later candidates have equal or more violations", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const pickBestCandidate = getPickBestCandidateMethod(
      markdownValidatorService,
    );
    const templateGrandchildren = [
      createNode("heading", {
        children: [createNode("text", { value: "Expected" })],
        depth: 2,
      }),
    ];
    const firstCandidate = createNode("list", {
      children: [
        createNode("heading", {
          children: [createNode("text", { value: "Expected" })],
          depth: 2,
        }),
      ],
      ordered: false,
    });
    const secondCandidate = createNode("list", {
      children: [
        createNode("heading", {
          children: [createNode("text", { value: "Unexpected" })],
          depth: 2,
        }),
      ],
      ordered: false,
    });

    const result = pickBestCandidate({
      candidates: [firstCandidate, secondCandidate],
      templateGrandchildren,
    });

    expect(result).toStrictEqual({
      bestCandidate: firstCandidate,
      minimumViolations: [],
    });
  });

  it("skips template text nodes and reports violations for non-text nodes", () => {
    const markdownValidatorService = new MarkdownValidatorService();
    const validateMarkdownChildren = getValidateMarkdownChildrenMethod(
      markdownValidatorService,
    );

    const violations = validateMarkdownChildren({
      instanceChildren: [createNode("heading", { depth: 1 })],
      templateChildren: [
        createNode("text", { value: "ignored-template-text" }),
        createNode("heading", { depth: 1 }),
        createNode("heading", { depth: 2 }),
      ],
    });

    expect(violations).toStrictEqual(['Missing markdown heading: ""']);
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

  it("validates missing and existing paths when configurationPath is undefined", async () => {
    const temporaryDirectoryPath = await mkdtemp(
      path.join(tmpdir(), "conformetry-markdown-validator-"),
    );
    const existingPath = "README.md";
    await writeFile(
      path.join(temporaryDirectoryPath, existingPath),
      "# Existing\n",
    );

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      filePaths: [existingPath, "MISSING.md"],
      workingDirectory: temporaryDirectoryPath,
    });

    expect(result.checkedPaths).toStrictEqual([existingPath, "MISSING.md"]);
    expect(result.ok).toBe(false);
    expect(result.pluginName).toBe("markdown");
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toContain("Missing Markdown path");
    expect(result.violations[0]).toContain("MISSING.md");
    expect(prepareTemplateValidationPayloadMock).not.toHaveBeenCalled();
  });

  it("includes templateRuleNames when preparing markdown validation payload", async () => {
    prepareTemplateValidationPayloadMock.mockResolvedValue({
      documents: [
        {
          filename: "README.md",
          instance: "# Overview\n",
          instanceFilePath: "src/README.md",
          renderedTemplate: "# Overview\n",
          templateFilePath: "templates/README.md",
        },
      ],
      violations: ["external violation"],
    });

    const markdownValidatorService = new MarkdownValidatorService();

    const result = await markdownValidatorService.validate({
      configurationPath: "configuration/conformetry.config.ts",
      filePaths: ["src/README.md"],
      templateRuleNames: ["markdown-rule"],
      workingDirectory: process.cwd(),
    });

    expect(prepareTemplateValidationPayloadMock).toHaveBeenCalledWith({
      configurationPath: "configuration/conformetry.config.ts",
      fileExtensions: [".md"],
      filePaths: ["src/README.md"],
      templateRuleNames: ["markdown-rule"],
      workingDirectory: process.cwd(),
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toStrictEqual(["external violation"]);
  });
});
