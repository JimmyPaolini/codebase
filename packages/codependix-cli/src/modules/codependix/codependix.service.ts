import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import {
  ImportGraphService,
  TypescriptProjectService,
} from "@codependix/imports";
import { ModuleGraphService, NestjsProjectService } from "@codependix/nestjs";
import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { DeliveryService } from "../delivery/delivery.service";
import { PythonImportsService } from "../python-imports/python-imports.service";

import {
  IMPORTS_GRAPH_TYPE,
  IMPORTS_MARKDOWN_SUBHEADING,
  MARKDOWN_SECTION_INTRO_LINE,
  NESTJS_GRAPH_TYPE,
  NESTJS_MARKDOWN_SUBHEADING,
  NX_GRAPH_TYPE,
  NX_MARKDOWN_SUBHEADING,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "./codependix.constants";

import type {
  CodependixRunMode,
  GraphRunOutcome,
  MarkdownSectionArguments,
  ProjectRunFailure,
  ProjectRunResult,
} from "../delivery/delivery.types";
import type {
  CodependixCommandOptions,
  GraphRunContext,
  ImportGraphExport,
  NestjsModuleGraphExport,
  NxNeighborhoodExport,
  NxWorkspaceGraphExport,
} from "./codependix.types";
import type {
  CodependixGraphType,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
} from "@codependix/configuration";
import type { TypescriptProject } from "@codependix/imports";
import type { NestjsProject } from "@codependix/nestjs";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";

/**
 * Builds and delivers every configured graph export.
 *
 * Orchestrates collaborators that each know nothing about the others:
 * `NeighborhoodService`/`WorkspaceGraphService` read the Nx project graph and
 * render Nx diagrams, `NestjsProjectService`/`ModuleGraphService` explore a
 * NestJS project's container and render its module diagram,
 * `ConfigurationService` resolves what each project wants exported and where,
 * and `DeliveryService` turns a resolved export configuration into file I/O.
 * This service is the only place that knows how those pieces fit together —
 * it renders each graph type's own JSON and diagram content and hands it to
 * `DeliveryService`, which knows nothing about Nx or NestJS at all.
 *
 * `run` resolves the configuration and reads the Nx project graph exactly
 * once, then hands both down to the four passes as a `GraphRunContext` —
 * each of them previously loaded the configuration and re-read the graph
 * itself. Every pass also isolates one project's failure from the rest: a
 * missing anchor or a NestJS project that fails to boot its container is
 * collected as a `ProjectRunFailure` rather than aborting the loop, so
 * `--write` either fully succeeds or reports exactly which projects failed
 * while still completing every other one.
 */
@Injectable()
export class CodependixService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly importGraphService: ImportGraphService,
    private readonly logger: LoggerService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly neighborhoodService: NeighborhoodService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonImportsService: PythonImportsService,
    private readonly typescriptProjectService: TypescriptProjectService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {
    this.logger.setContext(CodependixService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the section heading a graph type's anchored Markdown destination
   * auto-creates when it is missing.
   *
   * `subheading` is `undefined` only for the Workspace Graph: its anchor sits
   * directly under the `## 🕸️ Codependix` heading in the root README, since
   * that file carries no other graph type's section to disambiguate from.
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

  /** Resolves the run mode a command line's options selected. */
  private resolveMode(options: CodependixCommandOptions): CodependixRunMode {
    return options.check === true ? "check" : "write";
  }

  /**
   * Resolves one project's export target for a graph type, including its
   * workspace-relative root, so `include`/`exclude` globs may match either.
   */
  private resolveProjectOutput(args: {
    configuration: ResolvedCodependixConfiguration;
    graphType: CodependixGraphType;
    project: { absoluteRoot: string; name: string };
    workingDirectory: string;
  }): ResolvedCodependixGraphOutput {
    const { configuration, graphType, project, workingDirectory } = args;

    return this.configurationService.resolveForProject({
      configuration,
      graphType,
      projectName: project.name,
      projectRoot: path.relative(workingDirectory, project.absoluteRoot),
    });
  }

  /** Builds, renders, and delivers one project's file-level import Graph. */
  private runImportProject(args: {
    mode: CodependixRunMode;
    project: TypescriptProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, project, resolvedOutput } = args;
    const projectProgram = this.typescriptProjectService.buildProgram(project);
    const importGraph = this.importGraphService.buildGraph(projectProgram);
    const jsonExport: ImportGraphExport = importGraph;

    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(jsonExport),
      markdownContent:
        resolvedOutput.markdown === undefined
          ? undefined
          : this.importGraphService.renderMermaid(importGraph),
      markdownSection: this.buildMarkdownSection(IMPORTS_MARKDOWN_SUBHEADING),
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
      markdownSection: this.buildMarkdownSection(NESTJS_MARKDOWN_SUBHEADING),
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
      markdownSection: this.buildMarkdownSection(NX_MARKDOWN_SUBHEADING),
      mode,
      project,
      resolvedOutput,
    });
  }

  /**
   * Renders and delivers every included project's Nx Neighborhood, isolating
   * one project's failure from the rest — see `runNxGraphs`.
   */
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
        configuration: context.configuration,
        graphType: NX_GRAPH_TYPE,
        project,
        workingDirectory: context.workingDirectory,
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
    const { configuration, graph, mode, projects, workingDirectory } = context;
    const resolvedOutput =
      this.configurationService.resolveForWorkspace(configuration);

    if (resolvedOutput.target === "none") {
      return undefined;
    }

    const workspaceGraph: WorkspaceGraph =
      this.workspaceGraphService.buildWorkspaceGraph(graph, projects);
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
   * Runs every configured graph export, resolving the shared `GraphRunContext`
   * exactly once.
   *
   * Every pass is attempted regardless of whether an earlier one reported a
   * failure: the four graph types are independent, so a NestJS project
   * failing to boot its container has no bearing on whether the Nx or import
   * graphs finish.
   */
  async run(
    options: CodependixCommandOptions,
    workingDirectory: string,
  ): Promise<GraphRunOutcome> {
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
    });
    const graph = await this.neighborhoodService.readProjectGraph();
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );
    const context: GraphRunContext = {
      configuration,
      graph,
      mode: this.resolveMode(options),
      projects,
      workingDirectory,
    };

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
   * Builds and delivers every configured file-level import graph export.
   *
   * Every project carrying its own `tsconfig.json` participates — see
   * `TypescriptProjectService` — rather than only those tagged for a
   * particular framework, since a file-level import graph is meaningful for
   * any TypeScript project. A project that raises while its own export is
   * being resolved is recorded as a failure rather than aborting the pass, so
   * every other project still gets attempted.
   */
  runImportGraphs(context: GraphRunContext): GraphRunOutcome {
    const typescriptProjects = this.typescriptProjectService.discoverProjects(
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of typescriptProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        configuration: context.configuration,
        graphType: IMPORTS_GRAPH_TYPE,
        project,
        workingDirectory: context.workingDirectory,
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

    return { failures, results };
  }

  /**
   * Builds and delivers every configured NestJS module graph export.
   *
   * Only `framework:nestjs`-tagged projects participate, discovered from the
   * shared `context.graph` — see `NestjsProjectService`. A project that fails
   * to boot its container is recorded as a failure rather than aborting the
   * pass.
   */
  async runNestjsGraphs(context: GraphRunContext): Promise<GraphRunOutcome> {
    const nestjsProjects = this.nestjsProjectService.discoverProjects(
      context.graph,
      context.projects,
    );
    const results: GraphRunOutcome["results"] = [];
    const failures: ProjectRunFailure[] = [];

    for (const project of nestjsProjects) {
      const resolvedOutput = this.resolveProjectOutput({
        configuration: context.configuration,
        graphType: NESTJS_GRAPH_TYPE,
        project,
        workingDirectory: context.workingDirectory,
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

    return { failures, results };
  }

  /**
   * Builds and delivers every configured Nx graph export — each included
   * project's Neighborhood, and the whole-workspace Workspace Graph.
   *
   * A project whose resolved export target is `"none"` — because it named no
   * override, matched no include glob, or matched an exclude glob — is left
   * out of the result entirely rather than reported as up to date, so a
   * `--check` run's exit code depends only on exports codependix was actually
   * configured to produce. The Workspace Graph follows the same rule, and a
   * failure building or delivering it is recorded under
   * `WORKSPACE_GRAPH_PROJECT_NAME` rather than aborting the per-project loop
   * that already ran.
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
