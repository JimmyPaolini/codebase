import { Injectable } from "@nestjs/common";

import { CallablesService } from "../callables/callables.service";
import { ClassHierarchyService } from "../class-hierarchy/class-hierarchy.service";
import { ExternalService } from "../class-hierarchy/external.service";
import { CohesionService } from "../cohesion/cohesion.service";
import { EdgesService } from "../edges/edges.service";
import { EntryPointsService } from "../entry-points/entry-points.service";
import { ComponentsService } from "../graph/components.service";
import { DepthService } from "../graph/depth.service";
import { GraphService } from "../graph/graph.service";
import { PathsService } from "../graph/paths.service";
import { ProgramService } from "../program/program.service";
import { WorkspaceService } from "../workspace/workspace.service";

import { INCLUDE_CONSTRUCTOR_EDGES } from "./callidescope.constants";

import type { DiscoveredCallable } from "../callables/callables.types";
import type { EntryPointCollection } from "../entry-points/entry-points.types";
import type {
  CallGraph,
  CondensedGraph,
  DepthMeasurement,
} from "../graph/graph.types";
import type { TraceArguments, TraceOutcome } from "./callidescope.types";
import type {
  CallableId,
  CallGraphResult,
  DeepStackFinding,
  ModuleId,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";

/**
 * Runs one trace of a workspace, from tsconfig files to findings.
 */
@Injectable()
export class CallidescopeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callablesService: CallablesService,
    private readonly cohesionService: CohesionService,
    private readonly componentsService: ComponentsService,
    private readonly classHierarchyService: ClassHierarchyService,
    private readonly depthService: DepthService,
    private readonly edgesService: EdgesService,
    private readonly entryPointsService: EntryPointsService,
    private readonly externalService: ExternalService,
    private readonly graphService: GraphService,
    private readonly pathsService: PathsService,
    private readonly programService: ProgramService,
    private readonly workspaceService: WorkspaceService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the call graph and everything derived from it. */
  private buildGraph(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    workspaceRoot: string;
  }): {
    condensed: CondensedGraph;
    graph: CallGraph;
    measurement: DepthMeasurement;
  } {
    const graph = this.graphService.assemble(
      this.edgesService.build({
        callablesById: args.callablesById,
        includeConstructorEdges: INCLUDE_CONSTRUCTOR_EDGES,
        workspaceRoot: args.workspaceRoot,
      }),
    );
    const condensed = this.componentsService.condense({
      callableIds: args.callablesById.keys(),
      graph,
    });
    const moduleIdByCallable = new Map<CallableId, ModuleId>(
      [...args.callablesById].map(([callableId, callable]) => [
        callableId,
        callable.node.moduleId,
      ]),
    );

    return {
      condensed,
      graph,
      measurement: this.depthService.measure({
        condensed,
        graph,
        moduleIdByCallable,
      }),
    };
  }

  /** Turns every entry point over the limit into a reportable stack. */
  private findDeepStacks(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    condensed: CondensedGraph;
    entryPoints: EntryPointCollection;
    limit: number;
    measurement: DepthMeasurement;
  }): DeepStackFinding[] {
    const findings: DeepStackFinding[] = [];

    for (const entryPoint of args.entryPoints.entryPoints) {
      const componentId = args.condensed.componentIdByCallable.get(
        entryPoint.callableId,
      );
      const measured =
        componentId === undefined
          ? undefined
          : args.measurement.byComponent[componentId];

      if (measured === undefined || measured.depth <= args.limit) {
        continue;
      }

      findings.push({
        depth: measured.depth,
        entryPointKind: entryPoint.kind,
        frames: this.pathsService.buildDeepestPath({
          callablesById: args.callablesById,
          condensed: args.condensed,
          entryPointId: entryPoint.callableId,
          measurement: args.measurement,
        }),
        isLowerBound: measured.reachesUnresolved,
        limit: args.limit,
      });
    }

    return findings.toSorted((first, second) => second.depth - first.depth);
  }

  /** Reads the deepest depth any component reached. */
  private readMaximumDepth(measurement: DepthMeasurement): number {
    return measurement.byComponent.reduce(
      (deepest, entry) => Math.max(deepest, entry.depth),
      0,
    );
  }

  // 🌎 Public Methods

  /** Derives every finding from the collected callables. */
  public analyze(args: {
    callablesById: ReadonlyMap<CallableId, DiscoveredCallable>;
    configuration: ResolvedCallidescopeConfiguration;
    fileCount: number;
    projectCount: number;
    workspaceRoot: string;
  }): CallGraphResult {
    const { condensed, graph, measurement } = this.buildGraph(args);
    const entryPoints = this.entryPointsService.resolve({
      callablesById: args.callablesById,
      decorators: new Set(args.configuration.entryPoints.decorators),
      graph,
      includeExportedFunctions:
        args.configuration.entryPoints.includeExportedFunctions,
      includeOrphans: args.configuration.entryPoints.includeOrphans,
    });
    const cohesionArguments = {
      allowSpreadFor: args.configuration.allowSpreadFor,
      callablesById: args.callablesById,
      condensed,
      graph,
      limits: args.configuration.limits,
      measurement,
    };

    return {
      deepStacks: this.findDeepStacks({
        callablesById: args.callablesById,
        condensed,
        entryPoints,
        limit: args.configuration.limits.maximumDepth,
        measurement,
      }),
      misplacedCallables:
        this.cohesionService.findMisplacedCallables(cohesionArguments),
      moduleSpreads: this.cohesionService.findModuleSpreads(cohesionArguments),
      summary: {
        callableCount: args.callablesById.size,
        cyclicComponentCount: condensed.memberIdsByComponent.filter(
          (members) => members.length > 1,
        ).length,
        edgeCount: graph.edges.length,
        entryPointCount: entryPoints.entryPoints.length,
        fileCount: args.fileCount,
        maximumDepth: this.readMaximumDepth(measurement),
        projectCount: args.projectCount,
        unresolvedCallCount: graph.unresolvedCalls.length,
      },
      typeDepths: this.cohesionService.summarizeTypeDepths(cohesionArguments),
    };
  }

  /** Traces a workspace and returns everything the run found. */
  public trace(args: TraceArguments): TraceOutcome {
    const projects = this.workspaceService.discoverProjects({
      projectNames: args.projectNames,
      workspaceRoot: args.workspaceRoot,
    });
    const programSet = this.programService.buildPrograms({
      projects,
      workspaceRoot: args.workspaceRoot,
    });

    this.externalService.configure({
      ownedFilePaths: new Set(programSet.ownerByFilePath.keys()),
      workspaceRoot: args.workspaceRoot,
    });
    this.classHierarchyService.build({
      maximumFanOut: args.configuration.limits.maximumImplementationFanOut,
      programs: programSet.programs,
    });

    const collection = this.callablesService.collect({
      fileFilter: this.workspaceService.buildFileFilter({
        exclude: args.configuration.exclude,
        excludeFrom: args.configuration.excludeFrom,
        workspaceRoot: args.workspaceRoot,
      }),
      includeTests: args.configuration.entryPoints.includeTests,
      ownerByFilePath: programSet.ownerByFilePath,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      projectNames: projects.map((project) => project.name),
      result: this.analyze({
        callablesById: collection.byId,
        configuration: args.configuration,
        fileCount: collection.fileCount,
        projectCount: projects.length,
        workspaceRoot: args.workspaceRoot,
      }),
    };
  }
}
