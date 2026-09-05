import {
  CallablesService,
  ClassesService,
  CohesionService,
  EntriesService,
  ExternalService,
  GraphAssemblyService,
  ProgramService,
  WorkspaceService,
} from "@callidescope/graph";
import { ProjectReportsService } from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { INCLUDE_CONSTRUCTOR_EDGES } from "./callidescope.constants";

import type {
  LocateOutcome,
  TraceArguments,
  TraceOutcome,
} from "./callidescope.types";
import type {
  CallableId,
  CallGraphResult,
  CallGraphSummary,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type {
  CallableCollection,
  DepthMeasurement,
  DiscoveredCallable,
  SkippedProject,
} from "@callidescope/graph";

/**
 * Runs one trace of a workspace, from tsconfig files to findings.
 */
@Injectable()
export class CallidescopeService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callablesService: CallablesService,
    private readonly classHierarchyService: ClassesService,
    private readonly cohesionService: CohesionService,
    private readonly entryPointsService: EntriesService,
    private readonly externalService: ExternalService,
    private readonly graphAssemblyService: GraphAssemblyService,
    private readonly programService: ProgramService,
    private readonly projectReportsService: ProjectReportsService,
    private readonly workspaceService: WorkspaceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(CallidescopeService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks the workspace and collects every callable, without analyzing them.
   *
   * Shared by `trace`, which goes on to run the full analysis, and `locate`,
   * which only needs the collected callables and their graph to resolve one
   * address — cohesion, entry points, and project reports are work `locate`'s
   * callers never asked for.
   */
  private discoverCallables(args: TraceArguments): {
    collection: CallableCollection;
    projectNames: string[];
    projectRoots: ReadonlyMap<string, string>;
    skippedProjects: readonly SkippedProject[];
  } {
    this.workspaceService.configure(args.configuration.workspaceStructure);

    // Built before discovery rather than beside the collection it filters: a
    // project the exclusions name has to be dropped before its
    // `tsconfig.json` is opened, since opening it is what fails.
    const fileFilter = this.workspaceService.buildFileFilter({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workspaceRoot: args.workspaceRoot,
    });
    const projects = this.workspaceService.discoverProjects({
      directories: args.directories,
      fileFilter,
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
      maximumCandidates:
        args.configuration.limits.maximumImplementationCandidates,
      programs: programSet.programs,
    });

    const collection = this.callablesService.collect({
      fileFilter,
      includeTests: args.configuration.entryPoints.includeTests,
      ownerByFilePath: programSet.ownerByFilePath,
      workspaceRoot: args.workspaceRoot,
    });

    // The projects that really got a program, not every project discovered. A
    // project skipped for being unreadable has no callables, no stacks, and no
    // report — naming it here would put an empty section in a project README
    // and count it toward a project total the run never looked at.
    const traced = programSet.programs.map((program) => program.project);

    return {
      collection,
      projectNames: traced.map((project) => project.name),
      projectRoots: new Map(
        traced.map((project) => [project.name, project.root]),
      ),
      skippedProjects: programSet.skippedProjects,
    };
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
    fileCountByProject: ReadonlyMap<string, number>;
    projectCount: number;
    projectNames: readonly string[];
    workspaceRoot: string;
  }): CallGraphResult {
    const { breadthMeasurement, condensed, graph, measurement } =
      this.graphAssemblyService.assemble({
        callablesById: args.callablesById,
        ignoreCallees: args.configuration.ignoreCallees,
        includeConstructorEdges: INCLUDE_CONSTRUCTOR_EDGES,
        workspaceRoot: args.workspaceRoot,
      });
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

    const misplacedCallables =
      this.cohesionService.findMisplacedCallables(cohesionArguments);
    const moduleSpreads =
      this.cohesionService.findModuleSpreads(cohesionArguments);
    const typeDepths =
      this.cohesionService.summarizeTypeDepths(cohesionArguments);

    const projects = this.projectReportsService.build({
      breadthMeasurement,
      callablesById: args.callablesById,
      condensed,
      entryPoints,
      fileCountByProject: args.fileCountByProject,
      graph,
      measurement,
      misplacedCallables,
      moduleSpreads,
      projectNames: args.projectNames,
      typeDepths,
    });

    const summary: CallGraphSummary = {
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
    };

    this.logger.info("🔭 Finished an analysis", undefined, {
      callableCount: summary.callableCount,
      edgeCount: summary.edgeCount,
      entryPointCount: summary.entryPointCount,
      maximumDepth: summary.maximumDepth,
      misplacedCount: misplacedCallables.length,
      spreadCount: moduleSpreads.length,
    });

    return {
      deepStacks: this.projectReportsService.findDeepStacks({
        limit: args.configuration.limits.maximumDepth,
        reports: projects,
      }),
      misplacedCallables,
      moduleSpreads,
      projects,
      summary,
      typeDepths,
      // No default exists for `maximumBreadth`: until a project configures
      // one, nothing can exceed it, so an unset limit reports nothing rather
      // than picking a number nobody chose.
      wideCallables: this.projectReportsService.findWideCallables({
        limit: args.configuration.limits.maximumBreadth ?? Infinity,
        reports: projects,
      }),
    };
  }

  /**
   * Collects every callable and assembles the graph over them, without
   * running the analysis a full trace does.
   *
   * For the `depth` and `breadth` commands, which resolve one address against
   * the collected callables and then walk the graph from it — neither needs
   * cohesion, entry points, or project reports, all of which `analyze` builds
   * unconditionally.
   */
  public locate(args: TraceArguments): LocateOutcome {
    const { collection, projectRoots } = this.discoverCallables(args);
    const { graph } = this.graphAssemblyService.assemble({
      callablesById: collection.byId,
      ignoreCallees: args.configuration.ignoreCallees,
      includeConstructorEdges: INCLUDE_CONSTRUCTOR_EDGES,
      workspaceRoot: args.workspaceRoot,
    });

    return { callablesById: collection.byId, graph, projectRoots };
  }

  /** Traces a workspace and returns everything the run found. */
  public trace(args: TraceArguments): TraceOutcome {
    this.logger.info("🔭 Tracing a workspace", undefined, {
      workspaceRoot: args.workspaceRoot,
    });

    const { collection, projectNames, projectRoots, skippedProjects } =
      this.discoverCallables(args);

    return {
      projectNames,
      projectRoots,
      result: this.analyze({
        callablesById: collection.byId,
        configuration: args.configuration,
        fileCount: collection.fileCount,
        fileCountByProject: collection.fileCountByProject,
        projectCount: projectNames.length,
        projectNames,
        workspaceRoot: args.workspaceRoot,
      }),
      skippedProjects,
    };
  }
}
