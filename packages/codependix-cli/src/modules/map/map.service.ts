import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { TypescriptService } from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import {
  NeighborhoodService,
  WorkspaceGraphService,
} from "@codependix/nx-projects";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { DeliveryService } from "../delivery/delivery.service";
import { PythonImportsService } from "../python-imports/python-imports.service";
import { WorkspaceGraphsService } from "../workspace-graphs/workspace-graphs.service";

import {
  FILE_IMPORTS_GRAPH_TYPE,
  FILE_IMPORTS_MARKDOWN_SUBHEADING,
  MARKDOWN_SECTION_INTRO_LINE,
  NESTJS_MODULES_GRAPH_TYPE,
  NESTJS_MODULES_MARKDOWN_SUBHEADING,
  NX_PROJECTS_GRAPH_TYPE,
  NX_PROJECTS_MARKDOWN_SUBHEADING,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "./map.constants";

import type {
  CodependixRunMode,
  GraphRunOutcome,
  MarkdownSectionArguments,
  ProjectRunFailure,
  ProjectRunResult,
} from "../delivery/delivery.types";
import type {
  GraphRunContext,
  NestjsModuleGraphExport,
  NxNeighborhoodExport,
  NxWorkspaceGraphExport,
  TypescriptImportGraphExport,
} from "./map.types";
import type {
  CodependixGraphType,
  ResolvedCodependixGraphOutput,
} from "@codependix/configuration";
import type { TypescriptProject } from "@codependix/file-imports";
import type { NestjsProject } from "@codependix/nestjs-modules";
import type {
  Neighborhood,
  NxProject,
  WorkspaceGraph,
} from "@codependix/nx-projects";

/**
 * Builds and delivers every configured graph export.
 *
 * Orchestrates collaborators that each know nothing about the others —
 * `NeighborhoodService`/`WorkspaceGraphService` for Nx,
 * `NestjsProjectService`/`ModuleGraphService` for NestJS,
 * `ConfigurationService` for what each project wants exported and where, and
 * `DeliveryService` for the file I/O — rendering each graph type's own JSON
 * and diagram content and handing it to `DeliveryService`. The two
 * whole-workspace graphs beyond the Nx Workspace Graph live in
 * `WorkspaceGraphsService`, kept apart purely to stay under this file's line
 * limit.
 *
 * `run` resolves the configuration and reads the Nx project graph exactly
 * once, then hands both down to every pass as a `GraphRunContext`. Every pass
 * isolates one project's failure from the rest: a missing anchor or a NestJS
 * project that fails to boot its container is collected as a
 * `ProjectRunFailure` rather than aborting the loop.
 */
@Injectable()
export class MapService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly logger: LoggerService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly neighborhoodService: NeighborhoodService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonImportsService: PythonImportsService,
    private readonly typescriptService: TypescriptService,
    private readonly workspaceGraphService: WorkspaceGraphService,
    private readonly workspaceGraphsService: WorkspaceGraphsService,
  ) {
    this.logger.setContext(MapService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the section heading a graph type's anchored Markdown destination
   * auto-creates when it is missing. `subheading` is `undefined` only for
   * the Nx Workspace Graph, whose anchor sits directly under the root
   * README's `## 🕸️ Codependix` heading.
   */
  private buildMarkdownSection(subheading?: string): MarkdownSectionArguments {
    return { introLine: MARKDOWN_SECTION_INTRO_LINE, subheading };
  }

  /** Turns a neighborhood into the JSON shape it is exported as. */
  private buildNeighborhoodJsonExport(
    neighborhood: Neighborhood,
  ): NxNeighborhoodExport {
    return {
      dependencies: neighborhood.dependencies,
      dependents: neighborhood.dependents,
      edges: neighborhood.edges,
      projectName: neighborhood.projectName,
    };
  }

  /** Turns a raised error into a `ProjectRunFailure` for the given project. */
  private collectProjectFailure(
    projectName: string,
    error: unknown,
  ): ProjectRunFailure {
    return {
      error: error instanceof Error ? error.message : String(error),
      projectName,
    };
  }

  /** Resolves one project's export target for a graph type, carrying its root/tags. */
  private resolveProjectOutput(args: {
    context: GraphRunContext;
    graphType: CodependixGraphType;
    project: { absoluteRoot: string; name: string };
  }): ResolvedCodependixGraphOutput {
    const { context, graphType, project } = args;

    return this.configurationService.resolveForProject({
      configuration: context.configuration,
      graphType,
      projectName: project.name,
      projectRoot: path.relative(
        context.workingDirectory,
        project.absoluteRoot,
      ),
      projectTags: context.projects.find(
        (candidate) => candidate.name === project.name,
      )?.tags,
    });
  }

  /** Builds, renders, and delivers one project's file-level import Graph. */
  private runImportProject(args: {
    mode: CodependixRunMode;
    project: TypescriptProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, project, resolvedOutput } = args;
    const projectProgram = this.typescriptService.buildProgram(project);
    const importGraph = this.typescriptService.buildGraph(projectProgram);
    const jsonExport: TypescriptImportGraphExport = importGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.typescriptService.renderMermaid(importGraph),
      markdownSection: this.buildMarkdownSection(
        FILE_IMPORTS_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  /** Explores, renders, and delivers one NestJS project's module graph. */
  private async runNestjsProject(args: {
    mode: CodependixRunMode;
    project: NestjsProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): Promise<ProjectRunResult> {
    const { mode, project, resolvedOutput } = args;
    const tree = await this.nestjsProjectService.exploreProject(project);
    const moduleGraph = this.moduleGraphService.buildGraph(tree, project.name);
    const jsonExport: NestjsModuleGraphExport = moduleGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.moduleGraphService.renderMermaid(moduleGraph),
      markdownSection: this.buildMarkdownSection(
        NESTJS_MODULES_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  /** Renders and delivers one project's Nx Neighborhood. */
  private runNxProject(args: {
    mode: CodependixRunMode;
    neighborhood: Neighborhood;
    project: NxProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, neighborhood, project, resolvedOutput } = args;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(
              this.buildNeighborhoodJsonExport(neighborhood),
            ),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.neighborhoodService.renderMermaid(neighborhood),
      markdownSection: this.buildMarkdownSection(
        NX_PROJECTS_MARKDOWN_SUBHEADING,
      ),
      mode,
      project,
      resolvedOutput,
    });
  }

  /** Renders and delivers every included project's Nx Neighborhood — see `runNxGraphs`. */
  private runNxProjects(args: {
    context: GraphRunContext;
    neighborhoods: Map<string, Neighborhood>;
  }): GraphRunOutcome {
    const { context, neighborhoods } = args;
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of context.projects) {
      const neighborhood = neighborhoods.get(project.name);
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: NX_PROJECTS_GRAPH_TYPE,
        project,
      });

      if (neighborhood === undefined || resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          this.runNxProject({
            mode: context.mode,
            neighborhood,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    return { failures, results };
  }

  /** Renders and delivers the Workspace Graph's configured destinations. */
  private runWorkspaceGraph(
    context: GraphRunContext,
  ): ProjectRunResult | undefined {
    const { configuration, graph, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      NX_PROJECTS_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return undefined;
    }

    const workspaceGraph: WorkspaceGraph =
      this.workspaceGraphService.buildWorkspaceGraph(
        graph,
        context.selectedProjects,
      );
    const jsonExport: NxWorkspaceGraphExport = workspaceGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.workspaceGraphService.renderMermaid(workspaceGraph),
      markdownSection: this.buildMarkdownSection(),
      mode,
      project: {
        absoluteRoot: workingDirectory,
        name: WORKSPACE_GRAPH_PROJECT_NAME,
      },
      resolvedOutput,
    });
  }

  // 🌎 Public Methods

  /**
   * Runs every configured graph export against an already-resolved context.
   *
   * Every pass is attempted regardless of whether an earlier one reported a
   * failure: the four graph types are independent, so a NestJS project
   * failing to boot its container has no bearing on whether the Nx or import
   * graphs finish.
   */
  async run(context: GraphRunContext): Promise<GraphRunOutcome> {
    const nxOutcome = this.runNxGraphs(context);
    const nestjsOutcome = await this.runNestjsGraphs(context);
    const importsOutcome = this.runImportGraphs(context);
    const pythonImportsOutcome = this.runPythonImportGraphs(context);

    return {
      failures: [
        ...nxOutcome.failures,
        ...nestjsOutcome.failures,
        ...importsOutcome.failures,
        ...pythonImportsOutcome.failures,
      ],
      results: [
        ...nxOutcome.results,
        ...nestjsOutcome.results,
        ...importsOutcome.results,
        ...pythonImportsOutcome.results,
      ],
    };
  }

  /**
   * Builds and delivers every configured file-level import graph export —
   * each included project's own graph, and the whole-workspace file-imports
   * graph `WorkspaceGraphsService` combines from every TypeScript and Python
   * project. A project's own failure, or a failure building the whole
   * workspace graph, is recorded rather than aborting the pass — see
   * `runNxGraphs`.
   */
  runImportGraphs(context: GraphRunContext): GraphRunOutcome {
    const typescriptProjects = this.typescriptService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of typescriptProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: FILE_IMPORTS_GRAPH_TYPE,
        project,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          this.runImportProject({
            mode: context.mode,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    try {
      const workspaceResult =
        this.workspaceGraphsService.runFileImportsWorkspaceGraph(context);

      if (workspaceResult !== undefined) {
        results.push(workspaceResult);
      }
    } catch (error) {
      failures.push(
        this.collectProjectFailure(WORKSPACE_GRAPH_PROJECT_NAME, error),
      );
    }

    return { failures, results };
  }

  /**
   * Builds and delivers every configured NestJS module graph export — each
   * included project's own graph, and the whole-workspace NestJS module
   * graph `WorkspaceGraphsService` combines from every NestJS project. Only
   * `framework:nestjs`-tagged projects participate — see
   * `NestjsProjectService`. A project's own failure, or a failure building
   * the whole workspace graph, is recorded rather than aborting the pass —
   * see `runNxGraphs`.
   */
  async runNestjsGraphs(context: GraphRunContext): Promise<GraphRunOutcome> {
    const nestjsProjects = this.nestjsProjectService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of nestjsProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        context,
        graphType: NESTJS_MODULES_GRAPH_TYPE,
        project,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      try {
        results.push(
          await this.runNestjsProject({
            mode: context.mode,
            project,
            resolvedOutput,
          }),
        );
      } catch (error) {
        failures.push(this.collectProjectFailure(project.name, error));
      }
    }

    try {
      const workspaceResult =
        await this.workspaceGraphsService.runNestjsModulesWorkspaceGraph(
          context,
        );

      if (workspaceResult !== undefined) {
        results.push(workspaceResult);
      }
    } catch (error) {
      failures.push(
        this.collectProjectFailure(WORKSPACE_GRAPH_PROJECT_NAME, error),
      );
    }

    return { failures, results };
  }

  /**
   * Builds and delivers every configured Nx graph export — each included
   * project's Neighborhood, and the whole-workspace Workspace Graph. A
   * project resolving to `"none"` is left out of the result entirely, and a
   * failure building the Workspace Graph is recorded under
   * `WORKSPACE_GRAPH_PROJECT_NAME` rather than aborting the loop.
   */
  runNxGraphs(context: GraphRunContext): GraphRunOutcome {
    const neighborhoods = this.neighborhoodService.buildNeighborhoods(
      context.graph,
      context.projects,
    );
    const { failures, results } = this.runNxProjects({
      context,
      neighborhoods,
    });

    try {
      const workspaceResult = this.runWorkspaceGraph(context);

      if (workspaceResult !== undefined) {
        results.push(workspaceResult);
      }
    } catch (error) {
      failures.push(
        this.collectProjectFailure(WORKSPACE_GRAPH_PROJECT_NAME, error),
      );
    }

    return { failures, results };
  }

  /**
   * Builds and delivers every configured Python file-level import graph
   * export.
   *
   * Delegates to `PythonImportsService` — the pass itself follows
   * `runImportGraphs` exactly, but lives in its own file so this one stays
   * under the repository's per-file line limit.
   */
  runPythonImportGraphs(context: GraphRunContext): GraphRunOutcome {
    return this.pythonImportsService.runGraphs(context);
  }
}
