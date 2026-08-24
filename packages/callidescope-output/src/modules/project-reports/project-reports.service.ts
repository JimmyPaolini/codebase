import { PathsService, SignaturesService } from "@callidescope/graph";
import { Injectable } from "@nestjs/common";

import { MINIMUM_STACK_FRAMES } from "./project-reports.constants";

import type { BuildProjectReportsArguments } from "./project-reports.types";
import type {
  CallableBreadthReport,
  CallGraphSummary,
  CallStack,
  DeepStackFinding,
  ProjectReport,
  WideCallableFinding,
} from "@callidescope/configuration";

/**
 * Scopes a run's findings to the project each one came from.
 *
 * A section embedded in a project's README should describe that project, not
 * the workspace it happens to sit in, so everything here is keyed on the
 * project the entry point — or the reported callable — belongs to.
 */
@Injectable()
export class ProjectReportsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly pathsService: PathsService,
    private readonly signaturesService: SignaturesService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds every callable's breadth, grouped by project. */
  private buildCallableBreadths(
    args: BuildProjectReportsArguments,
  ): Map<string, CallableBreadthReport[]> {
    const byProject = new Map<string, CallableBreadthReport[]>();

    for (const [callableId, callable] of args.callablesById) {
      const measured = args.breadthMeasurement.byCallable.get(callableId);

      if (measured === undefined || measured.breadth === 0) {
        continue;
      }

      const callees = measured.calleeIds.flatMap((calleeId) => {
        const callee = args.callablesById.get(calleeId);

        return callee === undefined
          ? []
          : [{ displayName: callee.node.displayName, id: calleeId }];
      });

      const reports = byProject.get(callable.node.projectName) ?? [];

      reports.push({
        breadth: measured.breadth,
        callees,
        displayName: callable.node.displayName,
        id: callableId,
        location: callable.node.location,
        signature: this.signaturesService.read({
          checker: callable.projectProgram.checker,
          declaration: callable.declaration,
        }),
      });
      byProject.set(callable.node.projectName, reports);
    }

    return byProject;
  }

  /** Builds every stack that makes at least one call, deepest first. */
  private buildStacks(
    args: BuildProjectReportsArguments,
  ): Map<string, CallStack[]> {
    const byProject = new Map<string, CallStack[]>();

    for (const entryPoint of args.entryPoints.entryPoints) {
      const callable = args.callablesById.get(entryPoint.callableId);
      const measured =
        callable === undefined
          ? undefined
          : this.readDepth({
              callableId: entryPoint.callableId,
              condensed: args.condensed,
              measurement: args.measurement,
            });

      if (callable === undefined || measured === undefined) {
        continue;
      }

      const frames = this.pathsService.buildDeepestPath({
        callablesById: args.callablesById,
        condensed: args.condensed,
        entryPointId: entryPoint.callableId,
        measurement: args.measurement,
      });

      if (frames.length < MINIMUM_STACK_FRAMES) {
        continue;
      }

      const stacks = byProject.get(callable.node.projectName) ?? [];

      stacks.push({
        depth: measured.depth,
        entryPointKind: entryPoint.kind,
        frames,
        isLowerBound: measured.reachesUnresolved,
      });
      byProject.set(callable.node.projectName, stacks);
    }

    return byProject;
  }

  /** Counts what one project contributed to the graph. */
  private buildSummary(args: {
    callablesById: BuildProjectReportsArguments["callablesById"];
    fileCount: number;
    graph: BuildProjectReportsArguments["graph"];
    projectName: string;
    stacks: readonly CallStack[];
  }): CallGraphSummary {
    const owned = new Set<string>();

    for (const [callableId, callable] of args.callablesById) {
      if (callable.node.projectName === args.projectName) {
        owned.add(callableId);
      }
    }

    return {
      callableCount: owned.size,
      cyclicComponentCount: args.stacks.filter((stack) =>
        stack.frames.some((frame) => frame.isCycle),
      ).length,
      edgeCount: args.graph.edges.filter((edge) => owned.has(edge.callerId))
        .length,
      entryPointCount: args.stacks.length,
      fileCount: args.fileCount,
      maximumDepth: args.stacks.reduce(
        (deepest, stack) => Math.max(deepest, stack.depth),
        0,
      ),
      projectCount: 1,
      unresolvedCallCount: args.graph.unresolvedCalls.filter((call) =>
        owned.has(call.callerId),
      ).length,
    };
  }

  /** Reads the depth measured for one callable, or nothing if unmeasured. */
  private readDepth(args: {
    callableId: string;
    condensed: BuildProjectReportsArguments["condensed"];
    measurement: BuildProjectReportsArguments["measurement"];
  }): undefined | { depth: number; reachesUnresolved: boolean } {
    const componentId = args.condensed.componentIdByCallable.get(
      args.callableId,
    );

    if (componentId === undefined) {
      return undefined;
    }

    const measured = args.measurement.byComponent[componentId];

    return measured === undefined
      ? undefined
      : {
          depth: measured.depth,
          reachesUnresolved: measured.reachesUnresolved,
        };
  }

  // 🌎 Public Methods

  /** Builds one report per project, in the order the projects were traced. */
  public build(args: BuildProjectReportsArguments): ProjectReport[] {
    const stacksByProject = this.buildStacks(args);
    const callableBreadthsByProject = this.buildCallableBreadths(args);

    return args.projectNames.map((projectName) => {
      const stacks = (stacksByProject.get(projectName) ?? []).toSorted(
        (first, second) => second.depth - first.depth,
      );

      const owns = (callableId: string): boolean =>
        args.callablesById.get(callableId)?.node.projectName === projectName;

      return {
        callableBreadths: (
          callableBreadthsByProject.get(projectName) ?? []
        ).toSorted((first, second) => second.breadth - first.breadth),
        misplacedCallables: args.misplacedCallables.filter((finding) =>
          owns(finding.id),
        ),
        moduleSpreads: args.moduleSpreads.filter((finding) => owns(finding.id)),
        projectName,
        stacks,
        summary: this.buildSummary({
          callablesById: args.callablesById,
          fileCount: args.fileCountByProject.get(projectName) ?? 0,
          graph: args.graph,
          projectName,
          stacks,
        }),
        typeDepths: args.typeDepths.filter((summary) =>
          summary.moduleId.startsWith(`${projectName}:`),
        ),
      };
    });
  }

  /**
   * Picks the stacks a run should fail on, deepest first.
   *
   * A filter over the stacks the reports already hold rather than a second
   * traversal: reconstructing the same paths twice would let the number the
   * gate fails on drift from the number the README publishes.
   *
   * `maximumDepth` is a positive integer, so a stack past it is at least two
   * deep and therefore survived the minimum-frame filter above.
   */
  public findDeepStacks(args: {
    limit: number;
    reports: readonly ProjectReport[];
  }): DeepStackFinding[] {
    return args.reports
      .flatMap((report) => report.stacks)
      .filter((stack) => stack.depth > args.limit)
      .map((stack) => ({ ...stack, limit: args.limit }))
      .toSorted((first, second) => second.depth - first.depth);
  }

  /**
   * Picks the callables a run should fail on, widest first.
   *
   * A filter over the breadth reports the reports already hold, mirroring
   * `findDeepStacks`, so the number the gate fails on cannot drift from the
   * number the README publishes.
   */
  public findWideCallables(args: {
    limit: number;
    reports: readonly ProjectReport[];
  }): WideCallableFinding[] {
    return args.reports
      .flatMap((report) => report.callableBreadths)
      .filter((report) => report.breadth > args.limit)
      .map((report) => ({ ...report, limit: args.limit }))
      .toSorted((first, second) => second.breadth - first.breadth);
  }
}
