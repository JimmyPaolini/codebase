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

import {
  IMPORTS_GRAPH_TYPE,
  NESTJS_GRAPH_TYPE,
  NX_GRAPH_TYPE,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "./codependix.constants";

import type {
  CodependixRunMode,
  ProjectRunResult,
} from "../delivery/delivery.types";
import type {
  CodependixCommandOptions,
  ImportGraphExport,
  NestjsModuleGraphExport,
  NxNeighborhoodExport,
  NxWorkspaceGraphExport,
} from "./codependix.types";
import type {
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
} from "@codependix/configuration";
import type { TypescriptProject } from "@codependix/imports";
import type { NestjsProject } from "@codependix/nestjs";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";
import type { ProjectGraph } from "@nx/devkit";

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
    private readonly typescriptProjectService: TypescriptProjectService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {
    this.logger.setContext(CodependixService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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

  /** Resolves the run mode a command line's options selected. */
  private resolveMode(options: CodependixCommandOptions): CodependixRunMode {
    return options.check === true ? "check" : "write";
  }

  // 🌎 Public Methods

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
      mode,
      project,
      resolvedOutput,
    });
  }

  /**
   * Renders and delivers the Workspace Graph's configured destinations.
   *
   * Returns `undefined` when the resolved target is `"none"`, the same way a
   * per-project delivery is skipped entirely rather than reported current.
   */
  private runWorkspaceGraph(args: {
    configuration: ResolvedCodependixConfiguration;
    graph: ProjectGraph;
    mode: CodependixRunMode;
    projects: NxProject[];
    workingDirectory: string;
  }): ProjectRunResult | undefined {
    const { configuration, graph, mode, projects, workingDirectory } = args;
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
      mode,
      project: {
        absoluteRoot: workingDirectory,
        name: WORKSPACE_GRAPH_PROJECT_NAME,
      },
      resolvedOutput,
    });
  }

  /**
   * Builds and delivers every configured file-level import graph export.
   *
   * Every project carrying its own `tsconfig.json` participates — see
   * `TypescriptProjectService` — rather than only those tagged for a
   * particular framework, since a file-level import graph is meaningful for
   * any TypeScript project.
   */
  async runImportGraphs(
    options: CodependixCommandOptions,
    workingDirectory: string,
  ): Promise<ProjectRunResult[]> {
    const mode = this.resolveMode(options);
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
    });
    const graph = await this.neighborhoodService.readProjectGraph();
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );
    const typescriptProjects =
      this.typescriptProjectService.discoverProjects(projects);
    const results: ProjectRunResult[] = [];

    for (const project of typescriptProjects) {
      const resolvedOutput = this.configurationService.resolveForProject({
        configuration,
        graphType: IMPORTS_GRAPH_TYPE,
        projectName: project.name,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      results.push(this.runImportProject({ mode, project, resolvedOutput }));
    }

    return results;
  }

  /**
   * Builds and delivers every configured NestJS module graph export.
   *
   * Only `framework:nestjs`-tagged projects participate, discovered from the
   * same Nx project graph `runNxGraphs` reads — see `NestjsProjectService`.
   */
  async runNestjsGraphs(
    options: CodependixCommandOptions,
    workingDirectory: string,
  ): Promise<ProjectRunResult[]> {
    const mode = this.resolveMode(options);
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
    });
    const graph = await this.neighborhoodService.readProjectGraph();
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );
    const nestjsProjects = this.nestjsProjectService.discoverProjects(
      graph,
      projects,
    );
    const results: ProjectRunResult[] = [];

    for (const project of nestjsProjects) {
      const resolvedOutput = this.configurationService.resolveForProject({
        configuration,
        graphType: NESTJS_GRAPH_TYPE,
        projectName: project.name,
      });

      if (resolvedOutput.target === "none") {
        continue;
      }

      results.push(
        await this.runNestjsProject({ mode, project, resolvedOutput }),
      );
    }

    return results;
  }

  /**
   * Builds and delivers every configured Nx graph export — each included
   * project's Neighborhood, and the whole-workspace Workspace Graph.
   *
   * A project whose resolved export target is `"none"` — because it named no
   * override, matched no include glob, or matched an exclude glob — is left
   * out of the result entirely rather than reported as up to date, so a
   * `--check` run's exit code depends only on exports codependix was actually
   * configured to produce. The Workspace Graph follows the same rule: it is
   * left out of the result entirely when its own resolved target is `"none"`.
   */
  async runNxGraphs(
    options: CodependixCommandOptions,
    workingDirectory: string,
  ): Promise<ProjectRunResult[]> {
    const mode = this.resolveMode(options);
    const configuration = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workingDirectory,
    });
    const graph = await this.neighborhoodService.readProjectGraph();
    const projects = this.neighborhoodService.readProjects(
      graph,
      workingDirectory,
    );
    const neighborhoods = this.neighborhoodService.buildNeighborhoods(
      graph,
      projects,
    );
    const results: ProjectRunResult[] = [];

    for (const project of projects) {
      const neighborhood = neighborhoods.get(project.name);
      const resolvedOutput = this.configurationService.resolveForProject({
        configuration,
        graphType: NX_GRAPH_TYPE,
        projectName: project.name,
      });

      if (neighborhood === undefined || resolvedOutput.target === "none") {
        continue;
      }

      results.push(
        this.runNxProject({ mode, neighborhood, project, resolvedOutput }),
      );
    }

    const workspaceResult = this.runWorkspaceGraph({
      configuration,
      graph,
      mode,
      projects,
      workingDirectory,
    });

    return workspaceResult === undefined
      ? results
      : [...results, workspaceResult];
  }
}
