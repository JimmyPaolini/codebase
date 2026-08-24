import path from "node:path";

import { Injectable } from "@nestjs/common";

import type { DiscoveredCallable } from "../callables/callables.types";
import type {
  AnalyzeCohesionArguments,
  CallerDistribution,
} from "./cohesion.types";
import type {
  CallableId,
  MisplacedCallableFinding,
  ModuleId,
  ModuleSpreadFinding,
  TypeDepthSummary,
} from "@callidescope/configuration";

/**
 * Compares call stacks to say something about naming and structure.
 *
 * Two findings, chosen because a developer can act on both:
 *
 * Module spread asks what a function reaches. A function whose callees span
 * many unrelated modules is usually doing dispatch under a name that promises
 * one thing. Transitive breadth alone is not enough to say that — an entry
 * point legitimately reaches the whole program — so a callable is only reported
 * when it also calls several unrelated modules *directly*.
 *
 * Misplaced callables ask the opposite question: who calls this. When nearly
 * every caller lives in one module that is not its own, the function is
 * probably in the wrong file, and the fix is a move rather than a rewrite.
 */
@Injectable()
export class CohesionService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Folds one member's depth into its class's running summary. */
  private extendTypeSummary(args: {
    depth: number;
    existing: TypeDepthSummary | undefined;
    moduleId: ModuleId;
    typeName: string;
  }): TypeDepthSummary {
    const { depth, existing } = args;

    return {
      maximumDepth: Math.max(existing?.maximumDepth ?? 0, depth),
      memberCount: (existing?.memberCount ?? 0) + 1,
      minimumDepth: Math.min(existing?.minimumDepth ?? depth, depth),
      moduleId: args.moduleId,
      typeName: args.typeName,
    };
  }

  /** True when a file is exempt from the spread finding. */
  private isSpreadAllowed(args: {
    allowSpreadFor: readonly string[];
    filePath: string;
  }): boolean {
    return args.allowSpreadFor.some((glob) =>
      path.matchesGlob(args.filePath, glob),
    );
  }

  /**
   * Works out where a callable's callers actually live.
   *
   * Only callers inside the same project are counted. A shared package exists
   * to be called from elsewhere, so "every caller is in another project" is the
   * package working, not a misplacement — counting those would report that a
   * logger belongs inside whichever application logs the most.
   */
  private readCallerDistribution(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    callerIds: readonly CallableId[];
    projectName: string;
  }): CallerDistribution {
    const countByModule = new Map<ModuleId, number>();
    let totalCount = 0;

    for (const callerId of args.callerIds) {
      const caller = args.callablesById.get(callerId);

      if (caller?.node.projectName !== args.projectName) {
        continue;
      }

      totalCount += 1;
      countByModule.set(
        caller.node.moduleId,
        (countByModule.get(caller.node.moduleId) ?? 0) + 1,
      );
    }

    let dominantModuleId: ModuleId | undefined;
    let dominantCount = 0;

    for (const [moduleId, count] of countByModule) {
      if (count > dominantCount) {
        dominantCount = count;
        dominantModuleId = moduleId;
      }
    }

    return { dominantCount, dominantModuleId, totalCount };
  }

  /** Reads the depth measured for one callable's component. */
  private readDepth(args: {
    callableId: CallableId;
    condensed: AnalyzeCohesionArguments["condensed"];
    measurement: AnalyzeCohesionArguments["measurement"];
  }): { depth: number; spread: number } {
    const componentId = args.condensed.componentIdByCallable.get(
      args.callableId,
    );
    const measured =
      componentId === undefined
        ? undefined
        : args.measurement.byComponent[componentId];

    return {
      depth: measured?.depth ?? 0,
      spread: measured?.moduleIds.size ?? 0,
    };
  }

  /** Collects the modules a callable calls without any hop in between. */
  private readDirectModuleIds(args: {
    callable: DiscoveredCallable;
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    calleeIds: readonly CallableId[];
  }): ModuleId[] {
    const moduleIds = new Set<ModuleId>();

    for (const calleeId of args.calleeIds) {
      const callee = args.callablesById.get(calleeId);

      if (
        callee !== undefined &&
        callee.node.moduleId !== args.callable.node.moduleId
      ) {
        moduleIds.add(callee.node.moduleId);
      }
    }

    return [...moduleIds].toSorted();
  }

  // 🌎 Public Methods

  /** Finds callables whose callers nearly all live in one other module. */
  public findMisplacedCallables(
    args: AnalyzeCohesionArguments,
  ): MisplacedCallableFinding[] {
    const findings: MisplacedCallableFinding[] = [];

    for (const callable of args.callablesById.values()) {
      const callerIds =
        args.graph.callerIdsByCallee.get(callable.node.id) ?? [];
      const distribution = this.readCallerDistribution({
        callablesById: args.callablesById,
        callerIds,
        projectName: callable.node.projectName,
      });

      if (
        distribution.totalCount < args.limits.minimumCallers ||
        distribution.dominantModuleId === undefined ||
        distribution.dominantModuleId === callable.node.moduleId ||
        distribution.dominantCount / distribution.totalCount <
          args.limits.callerMajorityRatio
      ) {
        continue;
      }

      findings.push({
        callerCount: distribution.totalCount,
        displayName: callable.node.displayName,
        foreignCallerCount: distribution.dominantCount,
        homeModuleId: callable.node.moduleId,
        id: callable.node.id,
        location: callable.node.location,
        suggestedModuleId: distribution.dominantModuleId,
      });
    }

    return findings.toSorted(
      (first, second) => second.callerCount - first.callerCount,
    );
  }

  /** Finds callables whose callees span too many unrelated modules. */
  public findModuleSpreads(
    args: AnalyzeCohesionArguments,
  ): ModuleSpreadFinding[] {
    const findings: ModuleSpreadFinding[] = [];

    for (const callable of args.callablesById.values()) {
      if (
        this.isSpreadAllowed({
          allowSpreadFor: args.allowSpreadFor,
          filePath: callable.node.location.filePath,
        })
      ) {
        continue;
      }

      const { depth, spread } = this.readDepth({
        callableId: callable.node.id,
        condensed: args.condensed,
        measurement: args.measurement,
      });
      const directModuleIds = this.readDirectModuleIds({
        callable,
        callablesById: args.callablesById,
        calleeIds: args.graph.calleeIdsByCaller.get(callable.node.id) ?? [],
      });

      if (
        spread > args.limits.spreadThreshold &&
        directModuleIds.length >= args.limits.directSpreadThreshold
      ) {
        findings.push({
          depth,
          directModuleIds,
          displayName: callable.node.displayName,
          id: callable.node.id,
          location: callable.node.location,
          statementCount: callable.node.statementCount,
          transitiveSpread: spread,
        });
      }
    }

    return findings.toSorted(
      (first, second) => second.transitiveSpread - first.transitiveSpread,
    );
  }

  /**
   * Summarizes the depth range across each class's members.
   *
   * Reported as context rather than as a finding. A well-designed service has
   * both a one-line getter and a deep orchestrator, so a wide range says as
   * much about good code as bad, and gating on it would be noise.
   */
  public summarizeTypeDepths(
    args: AnalyzeCohesionArguments,
  ): TypeDepthSummary[] {
    const byType = new Map<string, TypeDepthSummary>();

    for (const callable of args.callablesById.values()) {
      const typeName = callable.node.enclosingTypeName;

      if (typeName === undefined) {
        continue;
      }

      const { depth } = this.readDepth({
        callableId: callable.node.id,
        condensed: args.condensed,
        measurement: args.measurement,
      });
      const key = `${callable.node.moduleId}#${typeName}`;

      byType.set(
        key,
        this.extendTypeSummary({
          depth,
          existing: byType.get(key),
          moduleId: callable.node.moduleId,
          typeName,
        }),
      );
    }

    return [...byType.values()].toSorted(
      (first, second) =>
        second.maximumDepth -
        second.minimumDepth -
        (first.maximumDepth - first.minimumDepth),
    );
  }
}
