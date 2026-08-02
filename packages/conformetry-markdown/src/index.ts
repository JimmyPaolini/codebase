import { access } from "node:fs/promises";
import path from "node:path";

import {
  prepareTemplateValidationPayload,
  type ConformetryValidatorPlugin,
} from "@jimmypaolini/conformetry-validation";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

interface MarkdownAbstractSyntaxTreeNode {
  alt?: string;
  children?: MarkdownAbstractSyntaxTreeNode[];
  depth?: number;
  lang?: string;
  ordered?: boolean;
  position?: {
    end?: { line?: number };
  };
  type: string;
  url?: string;
  value?: string;
}

const CONTAINER_TYPES = new Set<string>([
  "blockquote",
  "document",
  "list",
  "listItem",
  "root",
  "table",
  "tableCell",
  "tableRow",
]);

/**
 * Creates a validator plugin for Markdown files.
 */
export function createMarkdownValidatorPlugin(): ConformetryValidatorPlugin {
  return {
    descriptor: {
      description: "Checks markdown structural conformance using mdast",
      fileExtensions: [".md"],
      name: "markdown",
    },
    validate: async ({
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    }) => {
      if (configurationPath === undefined) {
        const pathViolations = await validatePathExistence({
          filePaths,
          workingDirectory,
        });

        return {
          checkedPaths: filePaths,
          ok: pathViolations.length === 0,
          pluginName: "markdown",
          violations: pathViolations,
        };
      }

      const payload = await prepareTemplateValidationPayload({
        configurationPath,
        fileExtensions: [".md"],
        filePaths,
        ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
        workingDirectory,
      });

      const issues: string[] = [];

      for (const document of payload.documents) {
        const violations = validateMarkdownDocument({
          instance: document.instance,
          renderedTemplate: document.renderedTemplate,
        });

        for (const violation of violations) {
          issues.push(
            `${document.instanceFilePath}: ${violation} (template: ${document.templateFilePath})`,
          );
        }
      }

      issues.push(...payload.violations);

      return {
        checkedPaths: filePaths,
        ok: issues.length === 0,
        pluginName: "markdown",
        violations: issues,
      };
    },
  };
}

/**
 * Filters unknown child nodes to mdast-compatible nodes.
 */
function filterMarkdownNodes(
  children: readonly unknown[],
): MarkdownAbstractSyntaxTreeNode[] {
  return children.filter(
    (childNode): childNode is MarkdownAbstractSyntaxTreeNode => {
      return (
        typeof childNode === "object" &&
        childNode !== null &&
        "type" in childNode
      );
    },
  );
}

/**
 * Returns children for a markdown node.
 */
function getNodeChildren(
  node: MarkdownAbstractSyntaxTreeNode,
): MarkdownAbstractSyntaxTreeNode[] {
  return node.children ?? [];
}

/**
 * Returns a matching score predicate per node type.
 */
function nodesMatch(
  templateNode: MarkdownAbstractSyntaxTreeNode,
  instanceNode: MarkdownAbstractSyntaxTreeNode,
): boolean {
  if (templateNode.type !== instanceNode.type) {
    return false;
  }

  switch (templateNode.type) {
    case "code": {
      return (
        (templateNode.lang ?? "") === (instanceNode.lang ?? "") &&
        (templateNode.value ?? "") === (instanceNode.value ?? "")
      );
    }
    case "heading": {
      return (
        templateNode.depth === instanceNode.depth &&
        toString(templateNode) === toString(instanceNode)
      );
    }
    case "html":
    case "inlineCode":
    case "text": {
      return (templateNode.value ?? "") === (instanceNode.value ?? "");
    }
    case "image": {
      return (
        (templateNode.url ?? "") === (instanceNode.url ?? "") &&
        (templateNode.alt ?? "") === (instanceNode.alt ?? "")
      );
    }
    case "link": {
      return (
        (templateNode.url ?? "") === (instanceNode.url ?? "") &&
        toString(templateNode) === toString(instanceNode)
      );
    }
    case "list": {
      return templateNode.ordered === instanceNode.ordered;
    }
    case "table": {
      const templateFirstRow = templateNode.children?.[0];
      const instanceFirstRow = instanceNode.children?.[0];
      return (
        (templateFirstRow?.children?.length ?? 0) ===
        (instanceFirstRow?.children?.length ?? 0)
      );
    }
    case "tableRow": {
      return (
        getNodeChildren(templateNode).length ===
        getNodeChildren(instanceNode).length
      );
    }
    case "thematicBreak": {
      return true;
    }
    default: {
      return toString(templateNode) === toString(instanceNode);
    }
  }
}

/**
 * Picks the candidate that minimizes subtree validation violations.
 */
function pickBestCandidate(args: {
  candidates: MarkdownAbstractSyntaxTreeNode[];
  templateGrandchildren: MarkdownAbstractSyntaxTreeNode[];
}): {
  bestCandidate: MarkdownAbstractSyntaxTreeNode;
  minimumViolations: string[];
} {
  const initialCandidate = args.candidates[0];
  if (initialCandidate === undefined) {
    throw new Error("Expected at least one markdown candidate.");
  }

  let bestCandidate = initialCandidate;
  let minimumViolations: string[] = [];
  let minimumViolationCount = Number.POSITIVE_INFINITY;

  for (const candidate of args.candidates) {
    const candidateViolations = validateMarkdownChildren({
      instanceChildren: getNodeChildren(candidate),
      templateChildren: args.templateGrandchildren,
    });

    if (candidateViolations.length < minimumViolationCount) {
      minimumViolationCount = candidateViolations.length;
      minimumViolations = candidateViolations;
      bestCandidate = candidate;
    }
  }

  return {
    bestCandidate,
    minimumViolations,
  };
}

/**
 * Processes a container node by matching children recursively.
 */
function processContainerNode(args: {
  instanceChildren: MarkdownAbstractSyntaxTreeNode[];
  lastMatchedInstanceNode: MarkdownAbstractSyntaxTreeNode | undefined;
  templateChild: MarkdownAbstractSyntaxTreeNode;
}): {
  lastMatched: MarkdownAbstractSyntaxTreeNode | undefined;
  violations: string[];
} {
  const candidates = args.instanceChildren.filter((instanceChild) => {
    return nodesMatch(args.templateChild, instanceChild);
  });

  if (candidates.length === 0) {
    return {
      lastMatched: args.lastMatchedInstanceNode,
      violations: [
        buildMissingNodeMessage(
          args.templateChild,
          args.lastMatchedInstanceNode,
        ),
      ],
    };
  }

  const templateGrandchildren = getNodeChildren(args.templateChild);
  if (templateGrandchildren.length === 0) {
    return {
      lastMatched: candidates.at(-1),
      violations: [],
    };
  }

  const candidateMatch = pickBestCandidate({
    candidates,
    templateGrandchildren,
  });

  return {
    lastMatched: candidateMatch.bestCandidate,
    violations: candidateMatch.minimumViolations,
  };
}

/**
 * Processes a leaf node by exact matcher checks.
 */
function processLeafNode(args: {
  instanceChildren: MarkdownAbstractSyntaxTreeNode[];
  lastMatchedInstanceNode: MarkdownAbstractSyntaxTreeNode | undefined;
  templateChild: MarkdownAbstractSyntaxTreeNode;
}): {
  lastMatched: MarkdownAbstractSyntaxTreeNode | undefined;
  violations: string[];
} {
  const candidates = args.instanceChildren.filter((instanceChild) => {
    return nodesMatch(args.templateChild, instanceChild);
  });

  if (candidates.length === 0) {
    return {
      lastMatched: args.lastMatchedInstanceNode,
      violations: [
        buildMissingNodeMessage(
          args.templateChild,
          args.lastMatchedInstanceNode,
        ),
      ],
    };
  }

  return {
    lastMatched: candidates.at(-1),
    violations: [],
  };
}

/**
 * Validates markdown child nodes.
 */
function validateMarkdownChildren(args: {
  instanceChildren: MarkdownAbstractSyntaxTreeNode[];
  templateChildren: MarkdownAbstractSyntaxTreeNode[];
}): string[] {
  const violations: string[] = [];
  let lastMatchedInstanceNode: MarkdownAbstractSyntaxTreeNode | undefined;

  for (const templateChild of args.templateChildren) {
    if (templateChild.type === "text") {
      continue;
    }

    const result = CONTAINER_TYPES.has(templateChild.type)
      ? processContainerNode({
          instanceChildren: args.instanceChildren,
          lastMatchedInstanceNode,
          templateChild,
        })
      : processLeafNode({
          instanceChildren: args.instanceChildren,
          lastMatchedInstanceNode,
          templateChild,
        });

    violations.push(...result.violations);
    lastMatchedInstanceNode = result.lastMatched;
  }

  return violations;
}

/**
 * Validates markdown document conformance via mdast matching.
 */
function validateMarkdownDocument(args: {
  instance: string;
  renderedTemplate: string;
}): string[] {
  const processor = remark().use(remarkGfm);
  const templateTree = processor.parse(args.renderedTemplate);
  const instanceTree = processor.parse(args.instance);
  const templateChildren = filterMarkdownNodes(templateTree.children);
  const instanceChildren = filterMarkdownNodes(instanceTree.children);

  return validateMarkdownChildren({
    instanceChildren,
    templateChildren,
  });
}

/**
 * Builds a readable missing-node message.
 */
function buildMissingNodeMessage(
  templateNode: MarkdownAbstractSyntaxTreeNode,
  instanceHint: MarkdownAbstractSyntaxTreeNode | undefined,
): string {
  const templateText = toString(templateNode);
  const instanceHintLine = instanceHint?.position?.end?.line;
  const locationSuffix =
    instanceHintLine === undefined
      ? ""
      : ` near instance line ${instanceHintLine + 1}`;
  return `Missing markdown ${templateNode.type}: \"${templateText}\"${locationSuffix}`;
}

/**
 * Validates that each provided path exists.
 */
async function validatePathExistence(args: {
  filePaths: string[];
  workingDirectory: string;
}): Promise<string[]> {
  const issues: string[] = [];

  for (const filePath of args.filePaths) {
    const resolvedPath = path.resolve(args.workingDirectory, filePath);
    if (!(await pathExists(resolvedPath))) {
      issues.push(`Missing Markdown path ${resolvedPath}`);
    }
  }

  return issues;
}

/**
 * Resolves whether a file path exists.
 */
async function pathExists(pathName: string): Promise<boolean> {
  try {
    await access(pathName);
    return true;
  } catch {
    return false;
  }
}
