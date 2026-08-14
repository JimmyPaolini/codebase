import { Injectable } from "@nestjs/common";

import { TypescriptNodesService } from "./typescript-nodes.service";

import type {
  CompareTreeArguments,
  TypescriptComparisonError,
} from "./typescript-validator.types";
import type { Node } from "typescript";

/* v8 ignore start -- the decorator helper emits a branch no test can reach */
/**
 * Walks two syntax trees in parallel and reports what the template requires
 * but the instance does not contain.
 *
 * The template is a **structural subset** requirement: every declaration it
 * makes must exist somewhere in the instance, but the instance may add
 * anything and may order its members freely.
 */
@Injectable()
/* v8 ignore stop */
export class TypescriptTreeService {
  // 🏗 Dependency Injection

  constructor(
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
    };
  }

  /**
   * Descends into whichever candidate explains the template best.
   *
   * Several instance nodes can share a key or kind — two methods with the same
   * name on different classes, say — so the one producing the fewest errors is
   * taken as the intended match.
   */
  private compareBestCandidate(args: {
    candidates: Node[];
    templateChild: Node;
  }): TypescriptComparisonError[] {
    return args.candidates
      .map((candidate) => {
        return this.compareTree({
          instanceNode: candidate,
          templateNode: args.templateChild,
        });
      })
      .reduce((fewest, candidate) => {
        return candidate.length < fewest.length ? candidate : fewest;
      });
  }

  /** Matches one template child against the instance's children. */
  private compareChild(args: {
    instanceChildren: Node[];
    instanceNode: Node;
    templateChild: Node;
  }): TypescriptComparisonError[] {
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
      return [
        this.buildError({
          instanceNode: args.instanceNode,
          nodeKey,
          templateChild: args.templateChild,
        }),
      ];
    }

    return this.compareBestCandidate({
      candidates,
      templateChild: args.templateChild,
    });
  }

  // 🌎 Public Methods

  /** Compares one level of two trees, descending into every match. */
  public compareTree(args: CompareTreeArguments): TypescriptComparisonError[] {
    const instanceChildren = this.typeScriptNodesService.readChildren(
      args.instanceNode,
    );

    return this.typeScriptNodesService
      .readChildren(args.templateNode)
      .flatMap((templateChild) => {
        return this.compareChild({
          instanceChildren,
          instanceNode: args.instanceNode,
          templateChild,
        });
      });
  }
}
