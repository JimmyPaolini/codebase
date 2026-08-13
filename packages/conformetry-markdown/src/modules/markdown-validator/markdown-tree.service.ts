import { Injectable } from "@nestjs/common";

import { MarkdownNodesService } from "./markdown-nodes.service";
import { CONTAINER_TYPES, SKIPPED_TYPES } from "./markdown-validator.constants";

import type {
  CompareChildrenArguments,
  CompareNodeArguments,
  CompareNodeResult,
  MarkdownComparisonError,
  MarkdownNode,
} from "./markdown-validator.types";

/**
 * Walks two markdown trees and reports what the template requires but the
 * instance lacks.
 *
 * The walk is order-preserving but not position-locked: each template node is
 * matched against any instance sibling, and the last match anchors the error
 * location for whatever follows. A document may therefore add sections freely,
 * as long as it still contains everything the template declares.
 */
@Injectable()
export class MarkdownTreeService {
  // 🏗 Dependency Injection

  constructor(private readonly markdownNodesService: MarkdownNodesService) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes a template node the instance does not contain. */
  private buildError(args: {
    lastMatchedNode: MarkdownNode | undefined;
    templateChild: MarkdownNode;
  }): MarkdownComparisonError {
    const anchorLine = args.lastMatchedNode?.position?.end?.line;

    return {
      instanceLine: anchorLine === undefined ? undefined : anchorLine + 1,
      nodeType: args.templateChild.type,
      text: this.markdownNodesService.readText(args.templateChild),
    };
  }

  /**
   * Matches a container node, then descends into it.
   *
   * Several instance nodes may match the container shape — two lists, say — so
   * the one whose children satisfy the most of the template is chosen.
   */
  private compareContainer(args: CompareNodeArguments): CompareNodeResult {
    const candidates = this.findCandidates(args);

    if (candidates.length === 0) {
      return {
        errors: [this.buildError(args)],
        lastMatchedNode: args.lastMatchedNode,
      };
    }

    const templateGrandchildren = this.markdownNodesService.readChildren(
      args.templateChild,
    );

    if (templateGrandchildren.length === 0) {
      return { errors: [], lastMatchedNode: candidates.at(-1) };
    }

    return candidates
      .map((candidate) => {
        return {
          errors: this.compareChildren({
            instanceChildren: this.markdownNodesService.readChildren(candidate),
            templateChildren: templateGrandchildren,
          }),
          lastMatchedNode: candidate,
        };
      })
      .reduce((fewest, candidate) => {
        return candidate.errors.length < fewest.errors.length
          ? candidate
          : fewest;
      });
  }

  /** Matches a leaf node on its own identity, without descending. */
  private compareLeaf(args: CompareNodeArguments): CompareNodeResult {
    const candidates = this.findCandidates(args);

    return candidates.length === 0
      ? {
          errors: [this.buildError(args)],
          lastMatchedNode: args.lastMatchedNode,
        }
      : { errors: [], lastMatchedNode: candidates.at(-1) };
  }

  /** Finds every instance sibling satisfying the template node. */
  private findCandidates(args: CompareNodeArguments): MarkdownNode[] {
    return args.instanceChildren.filter((instanceNode) => {
      return this.markdownNodesService.matches({
        instanceNode,
        templateNode: args.templateChild,
      });
    });
  }

  // 🌎 Public Methods

  /** Compares one level of two trees, descending into containers. */
  public compareChildren(
    args: CompareChildrenArguments,
  ): MarkdownComparisonError[] {
    const errors: MarkdownComparisonError[] = [];
    let lastMatchedNode: MarkdownNode | undefined;

    for (const templateChild of args.templateChildren) {
      if (SKIPPED_TYPES.has(templateChild.type)) {
        continue;
      }

      const result = CONTAINER_TYPES.has(templateChild.type)
        ? this.compareContainer({
            instanceChildren: args.instanceChildren,
            lastMatchedNode,
            templateChild,
          })
        : this.compareLeaf({
            instanceChildren: args.instanceChildren,
            lastMatchedNode,
            templateChild,
          });

      errors.push(...result.errors);
      lastMatchedNode = result.lastMatchedNode;
    }

    return errors;
  }
}
