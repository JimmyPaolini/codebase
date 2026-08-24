import { ScoringService } from "@conformetry/core";
import { Injectable } from "@nestjs/common";

import { TypescriptNodesService } from "./typescript-nodes.service";

import type {
  CompareTreeArguments,
  TreeComparison,
  TypescriptComparisonError,
} from "./typescript-validator.types";
import type { Node } from "typescript";

/**
 * Walks two syntax trees in parallel and reports what the template requires
 * but the instance does not contain.
 *
 * The template is a **structural subset** requirement: every declaration it
 * makes must exist somewhere in the instance, but the instance may add
 * anything and may order its members freely.
 *
 * The walk also counts what it asked for. Every template node visited is one
 * requirement, and a node with no counterpart costs its whole subtree, so the
 * weight of a finding is proportional to how much of the template went
 * missing rather than to how many findings were printed.
 */
@Injectable()
export class TypescriptTreeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly scoringService: ScoringService,
    private readonly typeScriptNodesService: TypescriptNodesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Describes a template node with no instance counterpart. */
  private buildError(args: {
    instanceNode: Node;
    nodeKey: null | string;
    templateChild: Node;
  }): TypescriptComparisonError {
    return {
      instancePosition: args.instanceNode.getStart(),
      kindLabel: this.typeScriptNodesService.readKindLabel(args.templateChild),
      nodeKey: args.nodeKey ?? undefined,
      templatePosition: args.templateChild.getStart(),
      weight: this.typeScriptNodesService.countSubtree(args.templateChild),
    };
  }

  /**
   * Descends into whichever candidate explains the template best.
   *
   * Several instance nodes can share a key or kind — two methods with the same
   * name on different classes, say — so the one leaving the least of the
   * template unaccounted for is taken as the intended match.
   *
   * Weighed by failed weight rather than by error count: one finding standing
   * in for a whole missing class is a worse match than two missing imports,
   * and counting findings would have picked the wrong one.
   */
  private compareBestCandidate(args: {
    candidates: Node[];
    templateChild: Node;
  }): TreeComparison {
    return args.candidates
      .map((candidate) => {
        return this.compareTree({
          instanceNode: candidate,
          templateNode: args.templateChild,
        });
      })
      .reduce((best, candidate) => {
        return this.scoringService.sumWeights(candidate.differences) <
          this.scoringService.sumWeights(best.differences)
          ? candidate
          : best;
      });
  }

  /** Matches one template child against the instance's children. */
  private compareChild(args: {
    instanceChildren: Node[];
    instanceNode: Node;
    templateChild: Node;
  }): TreeComparison {
    const nodeKey = this.typeScriptNodesService.readKey(args.templateChild);
    const candidates =
      nodeKey === null
        ? args.instanceChildren.filter((instanceChild) => {
            return instanceChild.kind === args.templateChild.kind;
          })
        : args.instanceChildren.filter((instanceChild) => {
            return (
              this.typeScriptNodesService.readKey(instanceChild) === nodeKey
            );
          });

    if (candidates.length === 0) {
      const error = this.buildError({
        instanceNode: args.instanceNode,
        nodeKey,
        templateChild: args.templateChild,
      });

      // The subtree is both what the finding costs and what was asked for:
      // nothing below a missing node can be compared, so the walk stops here
      // and counts the whole thing as required and absent.
      return { differences: [error], totalWeight: error.weight };
    }

    return this.compareBestCandidate({
      candidates,
      templateChild: args.templateChild,
    });
  }

  // 🌎 Public Methods

  /** Compares one level of two trees, descending into every match. */
  public compareTree(args: CompareTreeArguments): TreeComparison {
    const instanceChildren = this.typeScriptNodesService.readChildren(
      args.instanceNode,
    );

    return this.typeScriptNodesService
      .readChildren(args.templateNode)
      .map((templateChild) => {
        return this.compareChild({
          instanceChildren,
          instanceNode: args.instanceNode,
          templateChild,
        });
      })
      .reduce<TreeComparison>(
        (combined, comparison) => {
          return {
            differences: [...combined.differences, ...comparison.differences],
            totalWeight: combined.totalWeight + comparison.totalWeight,
          };
        },
        // The node itself is the one requirement its own level contributes;
        // its children add theirs.
        { differences: [], totalWeight: 1 },
      );
  }
}
