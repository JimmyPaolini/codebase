import { access } from "node:fs/promises";
import path from "node:path";

import { prepareTemplateValidationPayload } from "@jimmypaolini/conformetry-configuration";
import { Injectable } from "@nestjs/common";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

import {
  CONTAINER_TYPES,
  MARKDOWN_VALIDATOR_FILE_EXTENSIONS,
  MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR,
} from "./markdown-validator.constants";

import type {
  MarkdownAbstractSyntaxTreeNode,
  MarkdownValidatorValidateArguments,
  MarkdownValidatorValidateResult,
  PickBestCandidateArguments,
  ProcessNodeArguments,
  ProcessNodeResult,
  ValidateMarkdownChildrenArguments,
  ValidateMarkdownDocumentArguments,
  ValidatePathExistenceArguments,
} from "./markdown-validator.types";

/**
 * Validates Markdown files against conformetry templates.
 */
@Injectable()
export class MarkdownValidatorService {
  public readonly pluginDescriptor = MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR;

  // 🌎 Public Methods

  /** Internal helper. */
  private buildMissingNodeMessage(
    templateNode: MarkdownAbstractSyntaxTreeNode,
    instanceHint: MarkdownAbstractSyntaxTreeNode | undefined,
  ): string {
    const templateText = toString(templateNode);
    const instanceHintLine = instanceHint?.position?.end?.line;
    const locationSuffix =
      instanceHintLine === undefined
        ? ""
        : ` near instance line ${instanceHintLine + 1}`;
    return `Missing markdown ${templateNode.type}: "${templateText}"${locationSuffix}`;
  }

  // 🔏 Private Methods

  /** Internal helper. */
  private filterMarkdownNodes(
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

  /** Internal helper. */
  private getNodeChildren(
    node: MarkdownAbstractSyntaxTreeNode,
  ): MarkdownAbstractSyntaxTreeNode[] {
    return node.children ?? [];
  }

  /** Internal helper. */
  private nodesMatch(
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
          this.getNodeChildren(templateNode).length ===
          this.getNodeChildren(instanceNode).length
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

  /** Internal helper. */
  private async pathExists(pathName: string): Promise<boolean> {
    try {
      await access(pathName);
      return true;
    } catch {
      return false;
    }
  }

  /** Internal helper. */
  private pickBestCandidate(arguments_: PickBestCandidateArguments): {
    readonly bestCandidate: MarkdownAbstractSyntaxTreeNode;
    readonly minimumViolations: string[];
  } {
    const initialCandidate = arguments_.candidates[0];
    if (initialCandidate === undefined) {
      throw new Error("Expected at least one markdown candidate.");
    }

    let bestCandidate = initialCandidate;
    let minimumViolations: string[] = [];
    let minimumViolationCount = Number.POSITIVE_INFINITY;

    for (const candidate of arguments_.candidates) {
      const candidateViolations = this.validateMarkdownChildren({
        instanceChildren: this.getNodeChildren(candidate),
        templateChildren: arguments_.templateGrandchildren,
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

  /** Internal helper. */
  private processContainerNode(
    arguments_: ProcessNodeArguments,
  ): ProcessNodeResult {
    const candidates = arguments_.instanceChildren.filter((instanceChild) => {
      return this.nodesMatch(arguments_.templateChild, instanceChild);
    });

    if (candidates.length === 0) {
      return {
        lastMatched: arguments_.lastMatchedInstanceNode,
        violations: [
          this.buildMissingNodeMessage(
            arguments_.templateChild,
            arguments_.lastMatchedInstanceNode,
          ),
        ],
      };
    }

    const templateGrandchildren = this.getNodeChildren(
      arguments_.templateChild,
    );
    if (templateGrandchildren.length === 0) {
      return {
        lastMatched: candidates.at(-1),
        violations: [],
      };
    }

    const candidateMatch = this.pickBestCandidate({
      candidates,
      templateGrandchildren,
    });

    return {
      lastMatched: candidateMatch.bestCandidate,
      violations: candidateMatch.minimumViolations,
    };
  }

  /** Internal helper. */
  private processLeafNode(arguments_: ProcessNodeArguments): ProcessNodeResult {
    const candidates = arguments_.instanceChildren.filter((instanceChild) => {
      return this.nodesMatch(arguments_.templateChild, instanceChild);
    });

    if (candidates.length === 0) {
      return {
        lastMatched: arguments_.lastMatchedInstanceNode,
        violations: [
          this.buildMissingNodeMessage(
            arguments_.templateChild,
            arguments_.lastMatchedInstanceNode,
          ),
        ],
      };
    }

    return {
      lastMatched: candidates.at(-1),
      violations: [],
    };
  }

  /** Internal helper. */
  private validateMarkdownChildren(
    arguments_: ValidateMarkdownChildrenArguments,
  ): string[] {
    const violations: string[] = [];
    let lastMatchedInstanceNode: MarkdownAbstractSyntaxTreeNode | undefined;

    for (const templateChild of arguments_.templateChildren) {
      if (templateChild.type === "text") {
        continue;
      }

      const result = CONTAINER_TYPES.has(templateChild.type)
        ? this.processContainerNode({
            instanceChildren: arguments_.instanceChildren,
            lastMatchedInstanceNode,
            templateChild,
          })
        : this.processLeafNode({
            instanceChildren: arguments_.instanceChildren,
            lastMatchedInstanceNode,
            templateChild,
          });

      violations.push(...result.violations);
      lastMatchedInstanceNode = result.lastMatched;
    }

    return violations;
  }

  /** Internal helper. */
  private validateMarkdownDocument(
    arguments_: ValidateMarkdownDocumentArguments,
  ): string[] {
    const processor = remark().use(remarkGfm);
    const templateTree = processor.parse(arguments_.renderedTemplate);
    const instanceTree = processor.parse(arguments_.instance);
    const templateChildren = this.filterMarkdownNodes(templateTree.children);
    const instanceChildren = this.filterMarkdownNodes(instanceTree.children);

    return this.validateMarkdownChildren({
      instanceChildren,
      templateChildren,
    });
  }

  /** Internal helper. */
  private async validatePathExistence(
    arguments_: ValidatePathExistenceArguments,
  ): Promise<string[]> {
    const issues: string[] = [];

    for (const filePath of arguments_.filePaths) {
      const resolvedPath = path.resolve(arguments_.workingDirectory, filePath);
      if (!(await this.pathExists(resolvedPath))) {
        issues.push(`Missing Markdown path ${resolvedPath}`);
      }
    }

    return issues;
  }

  /** Internal helper. */
  public async validate(
    arguments_: MarkdownValidatorValidateArguments,
  ): Promise<MarkdownValidatorValidateResult> {
    const {
      configurationPath,
      filePaths,
      templateRuleNames,
      workingDirectory,
    } = arguments_;

    if (configurationPath === undefined) {
      const pathViolations = await this.validatePathExistence({
        filePaths,
        workingDirectory,
      });

      return {
        checkedPaths: filePaths,
        ok: pathViolations.length === 0,
        pluginName: MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR.name,
        violations: pathViolations,
      };
    }

    const payload = await prepareTemplateValidationPayload({
      configurationPath,
      fileExtensions: MARKDOWN_VALIDATOR_FILE_EXTENSIONS,
      filePaths,
      ...(templateRuleNames === undefined ? {} : { templateRuleNames }),
      workingDirectory,
    });

    const issues: string[] = [];

    for (const document of payload.documents) {
      const violations = this.validateMarkdownDocument({
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
      pluginName: MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR.name,
      violations: issues,
    };
  }
}
