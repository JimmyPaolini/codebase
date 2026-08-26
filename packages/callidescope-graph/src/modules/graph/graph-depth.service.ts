import { Injectable } from "@nestjs/common";

import type {
  ComponentDepth,
  DepthMeasurement,
  MeasureDepthArguments,
} from "./graph.types";
import type { CallableId, ModuleId } from "@callidescope/configuration";

/**
 * Measures the longest call stack below every component, and what it touches.
 *
 * Depth and module spread are computed in the same pass because they are the
 * same traversal: both are a fold over everything reachable from a node, and
 * running them together makes the cohesion finding effectively free.
 *
 * The traversal is iterative and post-order. Because it runs on the
 * condensation, which is acyclic, a memo entry is final once written — there is
 * no path along which a node could be revisited and get a different answer.
 */
@Injectable()
export class GraphDepthService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Folds every successor's result into one component's own. */
  private combine(args: {
    memberIds: readonly CallableId[];
    memo: readonly ComponentDepth[];
    ownModules: Set<ModuleId>;
    reachesUnresolved: boolean;
    successors: ReadonlySet<number>;
  }): ComponentDepth {
    const moduleIds = new Set(args.ownModules);
    const deepest = this.foldSuccessors({
      memo: args.memo,
      moduleIds,
      successors: args.successors,
    });

    // A cycle costs its member count once. Three functions calling each other
    // in a ring push at least three frames before the stack repeats, and no
    // finite number describes what happens after that.
    return {
      deepestSuccessor: deepest.successor,
      depth: args.memberIds.length + deepest.depth,
      moduleIds,
      reachesUnresolved: args.reachesUnresolved || deepest.reachesUnresolved,
    };
  }

  /**
   * Folds every successor's result into the running module set.
   *
   * Mutates `moduleIds` rather than returning a union, because this runs once
   * per component and allocating a fresh set per successor is the difference
   * between a linear pass and a quadratic one on a wide graph.
   */
  private foldSuccessors(args: {
    memo: readonly ComponentDepth[];
    moduleIds: Set<ModuleId>;
    successors: ReadonlySet<number>;
  }): {
    depth: number;
    reachesUnresolved: boolean;
    successor: number | undefined;
  } {
    let depth = 0;
    let reachesUnresolved = false;
    let successor: number | undefined;

    for (const candidate of args.successors) {
      const resolved = args.memo.at(candidate);

      if (resolved === undefined) {
        continue;
      }

      for (const moduleId of resolved.moduleIds) {
        args.moduleIds.add(moduleId);
      }

      reachesUnresolved = reachesUnresolved || resolved.reachesUnresolved;

      if (resolved.depth > depth) {
        depth = resolved.depth;
        successor = candidate;
      }
    }

    return { depth, reachesUnresolved, successor };
  }

  /** True when any member of a component holds an unfollowable call. */
  private hasUnresolved(args: {
    memberIds: readonly CallableId[];
    unresolvedCallerIds: ReadonlySet<CallableId>;
  }): boolean {
    return args.memberIds.some((memberId) =>
      args.unresolvedCallerIds.has(memberId),
    );
  }

  /** Collects the modules the members of one component sit in. */
  private readOwnModules(args: {
    memberIds: readonly CallableId[];
    moduleIdByCallable: ReadonlyMap<CallableId, ModuleId>;
  }): Set<ModuleId> {
    const moduleIds = new Set<ModuleId>();

    for (const memberId of args.memberIds) {
      const moduleId = args.moduleIdByCallable.get(memberId);

      if (moduleId !== undefined) {
        moduleIds.add(moduleId);
      }
    }

    return moduleIds;
  }

  // 🌎 Public Methods

  /** Measures every component, deepest-first, in one iterative pass. */
  public measure(args: MeasureDepthArguments): DepthMeasurement {
    const { condensed } = args;
    const byComponent: ComponentDepth[] = [];

    // Tarjan emits components in reverse topological order, so every successor
    // of a component has already been emitted by the time it is reached. One
    // forward sweep is therefore enough — no traversal, no recursion — and
    // every slot is filled before anything reads it.
    for (const memberIds of condensed.memberIdsByComponent) {
      byComponent.push(
        this.combine({
          memberIds,
          memo: byComponent,
          ownModules: this.readOwnModules({
            memberIds,
            moduleIdByCallable: args.moduleIdByCallable,
          }),
          reachesUnresolved: this.hasUnresolved({
            memberIds,
            unresolvedCallerIds: args.graph.unresolvedCallerIds,
          }),
          successors:
            condensed.successorsByComponent.at(byComponent.length) ??
            new Set<number>(),
        }),
      );
    }

    return { byComponent };
  }
}
