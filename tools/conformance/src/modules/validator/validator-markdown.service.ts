import { Injectable } from "@nestjs/common";
import { toString } from "mdast-util-to-string";
import { remark } from "remark";
import remarkGfm from "remark-gfm";

import { ValidatorTemplateService } from "./validator-template.service";

import type { MdastNode } from "./validator-markdown.types";
import type { TemplateConformanceArguments } from "./validator-template.types";
import type { ConformanceError } from "./validator.types";
/** Validates Markdown instance files against template structure. */
@Injectable()
export class ValidatorMarkdownService {
  // 🏗 Dependency Injection

  constructor(
    private readonly validatorTemplateService: ValidatorTemplateService,
  ) {}

  private readonly containerTypes = new Set<string>([
    "blockquote",
    "document",
    "list",
    "listItem",
    "root",
    "table",
    "tableCell",
    "tableRow",
  ]);

  private readonly errorMessageBuilders: Readonly<
    Record<string, (node: MdastNode) => string>
  > = {
    blockquote: (node: MdastNode): string =>
      `Expected blockquote: "${toString(node)}"`,
    break: (node: MdastNode): string => `Expected break: "${toString(node)}"`,
    code: (node: MdastNode): string =>
      `Expected code block (${node.lang ?? "(none)"}): "${node.value ?? ""}"`,
    definition: (node: MdastNode): string =>
      `Expected definition: "${toString(node)}"`,
    delete: (node: MdastNode): string =>
      `Expected strikethrough text: "${toString(node)}"`,
    emphasis: (node: MdastNode): string =>
      `Expected italic text: "${toString(node)}"`,
    footnoteDefinition: (node: MdastNode): string =>
      `Expected footnoteDefinition: "${toString(node)}"`,
    footnoteReference: (node: MdastNode): string =>
      `Expected footnoteReference: "${toString(node)}"`,
    heading: (node: MdastNode): string =>
      `Expected heading (h${String(node.depth)}): "${toString(node)}"`,
    html: (node: MdastNode): string => `Expected HTML block: "${node.value}"`,
    image: (node: MdastNode): string =>
      `Expected image "${node.alt ?? ""}" at "${node.url}"`,
    imageReference: (node: MdastNode): string =>
      `Expected imageReference: "${toString(node)}"`,
    inlineCode: (node: MdastNode): string =>
      `Expected inline code: \`${node.value}\``,
    inlineMath: (node: MdastNode): string =>
      `Expected inlineMath: "${toString(node)}"`,
    link: (node: MdastNode): string =>
      `Expected link to "${node.url}": "${toString(node)}"`,
    linkReference: (node: MdastNode): string =>
      `Expected linkReference: "${toString(node)}"`,
    list: (node: MdastNode): string =>
      `Expected ${node.ordered ? "ordered" : "unordered"} list`,
    listItem: (node: MdastNode): string =>
      `Expected list item: "${toString(node)}"`,
    math: (node: MdastNode): string => `Expected math: "${toString(node)}"`,
    paragraph: (node: MdastNode): string =>
      `Expected paragraph: "${toString(node)}"`,
    strong: (node: MdastNode): string =>
      `Expected bold text: "${toString(node)}"`,
    table: (_node: MdastNode): string => "Expected table",
    tableCell: (node: MdastNode): string =>
      `Expected table cell: "${toString(node)}"`,
    tableRow: (node: MdastNode): string =>
      `Expected table row: "${toString(node)}"`,
    text: (node: MdastNode): string => `Expected text: "${node.value}"`,
    thematicBreak: (_node: MdastNode): string =>
      "Expected thematic break (---)",
    yaml: (node: MdastNode): string => `Expected yaml: "${toString(node)}"`,
  };

  private readonly nodeMatchers: Readonly<
    Record<
      string,
      (templateNode: MdastNode, instanceNode: MdastNode) => boolean
    >
  > = {
    blockquote: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    break: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    code: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchCode(templateNode, instanceNode),
    definition: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    delete: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    emphasis: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    footnoteDefinition: (
      templateNode: MdastNode,
      instanceNode: MdastNode,
    ): boolean => this.matchByText(templateNode, instanceNode),
    footnoteReference: (
      templateNode: MdastNode,
      instanceNode: MdastNode,
    ): boolean => this.matchByText(templateNode, instanceNode),
    heading: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchHeading(templateNode, instanceNode),
    html: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchHtml(templateNode, instanceNode),
    image: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchImage(templateNode, instanceNode),
    imageReference: (
      templateNode: MdastNode,
      instanceNode: MdastNode,
    ): boolean => this.matchByText(templateNode, instanceNode),
    inlineCode: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchInlineCode(templateNode, instanceNode),
    inlineMath: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    link: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchLink(templateNode, instanceNode),
    linkReference: (
      templateNode: MdastNode,
      instanceNode: MdastNode,
    ): boolean => this.matchByText(templateNode, instanceNode),
    list: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchList(templateNode, instanceNode),
    listItem: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    math: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    paragraph: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    strong: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    table: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchTable(templateNode, instanceNode),
    tableCell: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
    tableRow: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchTableRow(templateNode, instanceNode),
    text: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchText(templateNode, instanceNode),
    thematicBreak: (): boolean => true,
    yaml: (templateNode: MdastNode, instanceNode: MdastNode): boolean =>
      this.matchByText(templateNode, instanceNode),
  };
  /** Internal helper. */
  private buildError(
    node: MdastNode,
    instanceHint: MdastNode | undefined,
  ): ConformanceError {
    return {
      errorType: "code",
      fix: `Add the missing ${node.type} to the instance file. See the template for the expected content.`,
      language: "markdown",
      message: this.buildErrorMessage(node),
      ...this.buildErrorPositions(node, instanceHint),
    };
  }
  /** Internal helper. */
  private buildErrorMessage(node: MdastNode): string {
    const builder = this.errorMessageBuilders[node.type];
    return builder
      ? builder(node)
      : `Expected ${node.type}: "${toString(node)}"`;
  }
  /** Internal helper. */
  private buildErrorPositions(
    node: MdastNode,
    instanceHint: MdastNode | undefined,
  ): Partial<ConformanceError> {
    const templateLine = node.position?.start?.line;
    const templateColumn = node.position?.start?.column;
    const instanceLine = this.buildInstanceLine(instanceHint);
    const instanceColumn = instanceLine === undefined ? undefined : 1;
    return this.definedEntries({
      instanceColumn,
      instanceLine,
      templateColumn,
      templateLine,
    });
  }
  /** Internal helper. */
  private buildInstanceLine(
    instanceHint: MdastNode | undefined,
  ): number | undefined {
    if (instanceHint === undefined) {
      return undefined;
    }
    const hintEndLine = instanceHint.position?.end?.line;
    if (hintEndLine === undefined) {
      return undefined;
    }
    return hintEndLine + 1;
  }
  /** Internal helper. */
  private definedEntries(
    fields: Readonly<Record<string, number | undefined>>,
  ): Partial<ConformanceError> {
    return Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
  }
  /** Internal helper. */
  private filterMdastNodes(children: readonly unknown[]): MdastNode[] {
    return children.filter(
      (node): node is MdastNode =>
        typeof node === "object" && node !== null && "type" in node,
    );
  }
  /** Internal helper. */
  private getNodeChildren(node: MdastNode): MdastNode[] {
    return node.children ?? [];
  }
  /** Internal helper. */
  private getTableColumnCount(tableNode: MdastNode): number {
    const firstRow = tableNode.children?.[0];
    return firstRow?.children?.length ?? 0;
  }
  /** Internal helper. */
  private matchByText(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return this.textsMatch(toString(templateNode), toString(instanceNode));
  }
  /** Internal helper. */
  private matchCode(templateNode: MdastNode, instanceNode: MdastNode): boolean {
    return (
      templateNode.lang === instanceNode.lang &&
      this.textsMatch(templateNode.value, instanceNode.value)
    );
  }
  /** Internal helper. */
  private matchHeading(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return (
      templateNode.depth === instanceNode.depth &&
      this.textsMatch(toString(templateNode), toString(instanceNode))
    );
  }
  /** Internal helper. */
  private matchHtml(templateNode: MdastNode, instanceNode: MdastNode): boolean {
    return this.textsMatch(templateNode.value, instanceNode.value);
  }
  /** Internal helper. */
  private matchImage(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return (
      this.textsMatch(templateNode.url, instanceNode.url) &&
      (templateNode.alt ?? "") === (instanceNode.alt ?? "")
    );
  }
  /** Internal helper. */
  private matchInlineCode(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return this.textsMatch(templateNode.value, instanceNode.value);
  }
  /** Internal helper. */
  private matchLink(templateNode: MdastNode, instanceNode: MdastNode): boolean {
    return (
      this.textsMatch(templateNode.url, instanceNode.url) &&
      this.textsMatch(toString(templateNode), toString(instanceNode))
    );
  }
  /** Internal helper. */
  private matchList(templateNode: MdastNode, instanceNode: MdastNode): boolean {
    return templateNode.ordered === instanceNode.ordered;
  }
  /** Internal helper. */
  private matchTable(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return (
      this.getTableColumnCount(templateNode) ===
      this.getTableColumnCount(instanceNode)
    );
  }
  /** Internal helper. */
  private matchTableRow(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    return (
      this.getNodeChildren(templateNode).length ===
      this.getNodeChildren(instanceNode).length
    );
  }
  /** Internal helper. */
  private matchText(templateNode: MdastNode, instanceNode: MdastNode): boolean {
    return this.textsMatch(templateNode.value, instanceNode.value);
  }
  /** Internal helper. */
  private nodesMatch(
    templateNode: MdastNode,
    instanceNode: MdastNode,
  ): boolean {
    if (templateNode.type !== instanceNode.type) {
      return false;
    }
    const matcher = this.nodeMatchers[templateNode.type];
    return matcher ? matcher(templateNode, instanceNode) : false;
  }
  /** Internal helper. */
  private pickBestCandidate(
    templateGrandchildren: readonly MdastNode[],
    candidates: readonly MdastNode[],
  ): { bestCandidate: MdastNode; minimumErrors: ConformanceError[] } {
    let minimumErrors: ConformanceError[] = [];
    let minimumErrorCount = Number.POSITIVE_INFINITY;
    const firstCandidate = candidates[0];
    if (!firstCandidate) {
      throw new Error("candidates must not be empty");
    }
    let bestCandidate: MdastNode = firstCandidate;

    for (const candidate of candidates) {
      const childErrors = this.validateMdastChildren(
        templateGrandchildren,
        this.getNodeChildren(candidate),
      );
      if (childErrors.length < minimumErrorCount) {
        minimumErrorCount = childErrors.length;
        minimumErrors = childErrors;
        bestCandidate = candidate;
      }
    }

    return { bestCandidate, minimumErrors };
  }
  /** Internal helper. */
  private processContainerChild(
    templateChild: MdastNode,
    instanceChildren: readonly MdastNode[],
    lastMatchedInstanceNode: MdastNode | undefined,
  ): {
    errors: ConformanceError[];
    lastMatched: MdastNode | undefined;
  } {
    const candidates = instanceChildren.filter((instanceChild) =>
      this.nodesMatch(templateChild, instanceChild),
    );

    if (candidates.length === 0) {
      return {
        errors: [this.buildError(templateChild, lastMatchedInstanceNode)],
        lastMatched: lastMatchedInstanceNode,
      };
    }

    const templateGrandchildren = this.getNodeChildren(templateChild);
    if (templateGrandchildren.length === 0) {
      return { errors: [], lastMatched: candidates.at(-1) };
    }

    const { bestCandidate, minimumErrors } = this.pickBestCandidate(
      templateGrandchildren,
      candidates,
    );
    return { errors: minimumErrors, lastMatched: bestCandidate };
  }
  /** Internal helper. */
  private processLeafChild(
    templateChild: MdastNode,
    instanceChildren: readonly MdastNode[],
    lastMatchedInstanceNode: MdastNode | undefined,
  ): {
    errors: ConformanceError[];
    lastMatched: MdastNode | undefined;
  } {
    const candidates = instanceChildren.filter((instanceChild) =>
      this.nodesMatch(templateChild, instanceChild),
    );
    if (candidates.length === 0) {
      return {
        errors: [this.buildError(templateChild, lastMatchedInstanceNode)],
        lastMatched: lastMatchedInstanceNode,
      };
    }
    return { errors: [], lastMatched: candidates.at(-1) };
  }
  /** Internal helper. */
  private textsMatch(
    templateText: string | undefined,
    instanceText: string | undefined,
  ): boolean {
    return (templateText ?? "") === (instanceText ?? "");
  }
  /** Internal helper. */
  private validateMdastChildren(
    templateChildren: readonly MdastNode[],
    instanceChildren: readonly MdastNode[],
  ): ConformanceError[] {
    const errors: ConformanceError[] = [];
    let lastMatchedInstanceNode: MdastNode | undefined;

    for (const templateChild of templateChildren) {
      if (templateChild.type === "text") {
        continue;
      }

      const isContainer = this.containerTypes.has(templateChild.type);
      const result = isContainer
        ? this.processContainerChild(
            templateChild,
            instanceChildren,
            lastMatchedInstanceNode,
          )
        : this.processLeafChild(
            templateChild,
            instanceChildren,
            lastMatchedInstanceNode,
          );

      errors.push(...result.errors);
      lastMatchedInstanceNode = result.lastMatched;
    }

    return errors;
  }
  /** Internal helper. */
  validateMarkdownConformance(args: {
    data: TemplateConformanceArguments["data"];
    filename: TemplateConformanceArguments["filename"];
    instance: TemplateConformanceArguments["instance"];
    template: TemplateConformanceArguments["template"];
  }): { errors: ConformanceError[] } {
    const { instance, renderedTemplate } =
      this.validatorTemplateService.prepareConformanceTexts(args);

    const processor = remark().use(remarkGfm);
    const templateAbstractSyntaxTree = processor.parse(renderedTemplate);
    const instanceAbstractSyntaxTree = processor.parse(instance);

    const templateChildren = this.filterMdastNodes(
      templateAbstractSyntaxTree.children,
    );
    const instanceChildren = this.filterMdastNodes(
      instanceAbstractSyntaxTree.children,
    );

    const errors = this.validateMdastChildren(
      templateChildren,
      instanceChildren,
    );

    return { errors };
  }
}
