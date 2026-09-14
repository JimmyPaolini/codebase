import { ConfigurationService } from "@codependix/configuration";
import {
  FileImportsWorkspaceGraphService,
  PythonService,
  TypescriptService,
} from "@codependix/file-imports";
import {
  ModuleGraphService,
  NestjsModulesWorkspaceGraphService,
  NestjsProjectService,
} from "@codependix/nestjs-modules";
import { Injectable } from "@nestjs/common";

import { DeliveryService } from "../delivery/delivery.service";
import {
  FILE_IMPORTS_GRAPH_TYPE,
  FILE_IMPORTS_MARKDOWN_SUBHEADING,
  MARKDOWN_SECTION_INTRO_LINE,
  NESTJS_MODULES_GRAPH_TYPE,
  NESTJS_MODULES_MARKDOWN_SUBHEADING,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "../map/map.constants";

import type {
  CodependixRunMode,
  MarkdownSectionArguments,
  ProjectRunResult,
} from "../delivery/delivery.types";
import type {
  FileImportsWorkspaceGraphExport,
  GraphRunContext,
  NestjsModulesWorkspaceGraphExport,
} from "../map/map.types";
import type { ResolvedCodependixGraphOutput } from "@codependix/configuration";
import type { TypescriptImportGraph } from "@codependix/file-imports";
import type { NestjsModuleGraph } from "@codependix/nestjs-modules";

/**
 * Builds and delivers the two whole-workspace graphs that are not the Nx
 * Workspace Graph: the file-imports graph (every TypeScript and Python
 * project's own import graph, combined) and the NestJS module graph (every
 * NestJS project's own module graph, combined).
 *
 * Split out of `MapService` — which owns the Nx Workspace Graph itself,
 * inline, since building it only needs one already-read Nx project graph —
 * purely to keep that file under this repository's per-file line limit. Each
 * of the two graphs here instead needs discovering and building every
 * relevant project's own graph before combining them, which is enough logic
 * to earn its own file, the same reasoning `PythonImportsService` follows for
 * the Python file-level import pass.
 */
@Injectable()
export class WorkspaceGraphsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly deliveryService: DeliveryService,
    private readonly fileImportsWorkspaceGraphService: FileImportsWorkspaceGraphService,
    private readonly moduleGraphService: ModuleGraphService,
    private readonly nestjsModulesWorkspaceGraphService: NestjsModulesWorkspaceGraphService,
    private readonly nestjsProjectService: NestjsProjectService,
    private readonly pythonService: PythonService,
    private readonly typescriptService: TypescriptService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds the section heading a graph type's anchored Markdown destination auto-creates when it is missing. */
  private buildMarkdownSection(subheading: string): MarkdownSectionArguments {
    return { introLine: MARKDOWN_SECTION_INTRO_LINE, subheading };
  }

  /**
   * Explores and builds every discovered NestJS project's own module graph.
   *
   * Kept apart from `runNestjsModulesWorkspaceGraph` so that method's own
   * direct callees stay under this repository's callidescope breadth limit.
   */
  private async buildNestjsModuleGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): Promise<NestjsModuleGraph[]> {
    const nestjsProjects =
      this.nestjsProjectService.discoverProjects(selectedProjects);
    const moduleGraphs: NestjsModuleGraph[] = [];

    for (const project of nestjsProjects) {
      const tree = await this.nestjsProjectService.exploreProject(project);

      moduleGraphs.push(this.moduleGraphService.buildGraph(tree, project.name));
    }

    return moduleGraphs;
  }

  /**
   * Builds every discovered TypeScript project's own file-level import graph.
   *
   * Kept apart from `runFileImportsWorkspaceGraph` for the same breadth
   * reason `buildNestjsModuleGraphs` is.
   */
  private buildTypescriptGraphs(
    selectedProjects: GraphRunContext["selectedProjects"],
  ): TypescriptImportGraph[] {
    return this.typescriptService
      .discoverProjects(selectedProjects)
      .map((project) =>
        this.typescriptService.buildGraph(
          this.typescriptService.buildProgram(project),
        ),
      );
  }

  /**
   * Delivers one already-built whole-workspace graph's configured
   * destinations, at the workspace root.
   *
   * The one place both `runFileImportsWorkspaceGraph` and
   * `runNestjsModulesWorkspaceGraph` hand off to `DeliveryService`, so
   * neither of them carries `DeliveryService`'s own three-call shape as
   * direct callees of its own.
   */
  private deliverWorkspaceGraph(args: {
    jsonExport: unknown;
    markdownContent: string;
    markdownSubheading: string;
    mode: CodependixRunMode;
    resolvedOutput: ResolvedCodependixGraphOutput;
    workingDirectory: string;
  }): ProjectRunResult {
    return this.deliveryService.deliverGraphOutput({
      jsonContent:
        args.resolvedOutput.json === undefined
          ? undefined
          : this.deliveryService.renderJson(args.jsonExport),
      markdownContent:
        args.resolvedOutput.markdown === undefined
          ? undefined
          : args.markdownContent,
      markdownSection: this.buildMarkdownSection(args.markdownSubheading),
      mode: args.mode,
      project: {
        absoluteRoot: args.workingDirectory,
        name: WORKSPACE_GRAPH_PROJECT_NAME,
      },
      resolvedOutput: args.resolvedOutput,
    });
  }

  // 🌎 Public Methods

  /**
   * Renders and delivers the whole-workspace file-level import graph's
   * configured destinations.
   *
   * Built from every discovered TypeScript and Python project's own import
   * graph, combined by `FileImportsWorkspaceGraphService` — the same "read
   * once, draw over the selected projects" shape `MapService.runWorkspaceGraph`
   * follows for the Nx Workspace Graph, applied to the two file-level import
   * builders instead of one Nx project graph read.
   */
  runFileImportsWorkspaceGraph(
    context: GraphRunContext,
  ): ProjectRunResult | undefined {
    const { configuration, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      FILE_IMPORTS_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return undefined;
    }

    const typescriptGraphs = this.buildTypescriptGraphs(
      context.selectedProjects,
    );
    const pythonGraphs = this.pythonService
      .discoverProjects(context.selectedProjects)
      .map((project) => this.pythonService.buildGraph(project));
    const workspaceGraph =
      this.fileImportsWorkspaceGraphService.buildWorkspaceGraph({
        pythonGraphs,
        typescriptGraphs,
      });
    const jsonExport: FileImportsWorkspaceGraphExport = workspaceGraph;

    return this.deliverWorkspaceGraph({
      jsonExport,
      markdownContent:
        this.fileImportsWorkspaceGraphService.renderMermaid(workspaceGraph),
      markdownSubheading: FILE_IMPORTS_MARKDOWN_SUBHEADING,
      mode,
      resolvedOutput,
      workingDirectory,
    });
  }

  /**
   * Explores, renders, and delivers the whole-workspace NestJS module
   * graph's configured destinations.
   *
   * Built from every discovered NestJS project's own module graph, combined
   * by `NestjsModulesWorkspaceGraphService` — the same shape
   * `runFileImportsWorkspaceGraph` follows, applied to booting every NestJS
   * project's container instead of building a `ts.Program` or parsing
   * Python source.
   */
  async runNestjsModulesWorkspaceGraph(
    context: GraphRunContext,
  ): Promise<ProjectRunResult | undefined> {
    const { configuration, mode, workingDirectory } = context;
    const resolvedOutput = this.configurationService.resolveForWorkspace(
      configuration,
      NESTJS_MODULES_GRAPH_TYPE,
    );

    if (resolvedOutput.target === "none") {
      return undefined;
    }

    const moduleGraphs = await this.buildNestjsModuleGraphs(
      context.selectedProjects,
    );
    const workspaceGraph =
      this.nestjsModulesWorkspaceGraphService.buildWorkspaceGraph(moduleGraphs);
    const jsonExport: NestjsModulesWorkspaceGraphExport = workspaceGraph;

    return this.deliverWorkspaceGraph({
      jsonExport,
      markdownContent:
        this.nestjsModulesWorkspaceGraphService.renderMermaid(workspaceGraph),
      markdownSubheading: NESTJS_MODULES_MARKDOWN_SUBHEADING,
      mode,
      resolvedOutput,
      workingDirectory,
    });
  }
}
