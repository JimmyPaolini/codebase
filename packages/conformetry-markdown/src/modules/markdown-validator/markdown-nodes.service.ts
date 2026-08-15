import { Injectable } from "@nestjs/common";
import { toString } from "mdast-util-to-string";

import type { MarkdownNode } from "./markdown-validator.types";

/**
 * Decides whether two markdown nodes are "the same node".
 *
 * Each node type has its own notion of identity: a heading is its depth plus
 * its text, a link is its URL plus its text, a table is its column count. This
 * is what lets a template require *a table with three columns* without
 * dictating its contents.
 */
@Injectable()
export class MarkdownNodesService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  /**
   * How to decide that two nodes of a given type are "the same node".
   *
   * A table rather than a switch so each rule stays its own small function —
   * one branch per markdown type in a single method is unreadable, and the
   * types that need no special rule fall through to a text comparison.
   */
  private readonly matchersByType: Record<
    string,
    (templateNode: MarkdownNode, instanceNode: MarkdownNode) => boolean
  > = {
    code: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.lang, instanceNode.lang) &&
        this.sameField(templateNode.value, instanceNode.value)
      );
    },
    heading: (templateNode, instanceNode) => {
      return (
        templateNode.depth === instanceNode.depth &&
        this.readText(templateNode) === this.readText(instanceNode)
      );
    },
    html: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    image: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.url, instanceNode.url) &&
        this.sameField(templateNode.alt, instanceNode.alt)
      );
    },
    inlineCode: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    link: (templateNode, instanceNode) => {
      return (
        this.sameField(templateNode.url, instanceNode.url) &&
        this.readText(templateNode) === this.readText(instanceNode)
      );
    },
    list: (templateNode, instanceNode) => {
      return templateNode.ordered === instanceNode.ordered;
    },
    table: (templateNode, instanceNode) => {
      return (
        this.readColumnCount(templateNode) ===
        this.readColumnCount(instanceNode)
      );
    },
    tableRow: (templateNode, instanceNode) => {
      return (
        this.readChildren(templateNode).length ===
        this.readChildren(instanceNode).length
      );
    },
    text: (templateNode, instanceNode) => {
      return this.sameField(templateNode.value, instanceNode.value);
    },
    thematicBreak: () => true,
  };

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Counts a table's columns from its first row. */
  private readColumnCount(node: MarkdownNode): number {
    const firstRow = this.readChildren(node)[0];

    return firstRow === undefined ? 0 : this.readChildren(firstRow).length;
  }

  /** Compares two optional string fields, treating absent as empty. */
  private sameField(
    leftValue: string | undefined,
    rightValue: string | undefined,
  ): boolean {
    return (leftValue ?? "") === (rightValue ?? "");
  }

  // 🌎 Public Methods

  /** Narrows a raw mdast child list to the nodes this validator understands. */
  public filterNodes(children: readonly unknown[]): MarkdownNode[] {
    return children.filter((childNode): childNode is MarkdownNode => {
      return (
        typeof childNode === "object" &&
        childNode !== null &&
        "type" in childNode
      );
    });
  }

  /** Returns whether an instance node satisfies a template node. */
  public matches(args: {
    instanceNode: MarkdownNode;
    templateNode: MarkdownNode;
  }): boolean {
    const { instanceNode, templateNode } = args;

    if (templateNode.type !== instanceNode.type) {
      return false;
    }

    const matcher = this.matchersByType[templateNode.type];

    return matcher === undefined
      ? this.readText(templateNode) === this.readText(instanceNode)
      : matcher(templateNode, instanceNode);
  }

  /** Reads a node's children, or an empty list for a leaf. */
  public readChildren(node: MarkdownNode): MarkdownNode[] {
    return node.children ?? [];
  }

  /** Reads a node's rendered plain text. */
  public readText(node: MarkdownNode): string {
    return toString(node);
  }
}
