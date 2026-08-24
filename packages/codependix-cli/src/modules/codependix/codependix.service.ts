import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@codependix/configuration";
import { NeighborhoodService, WorkspaceGraphService } from "@codependix/nx";
import { Injectable } from "@nestjs/common";

import { LoggerService } from "@codebase/logger";

import { AnchorNotFoundError } from "../anchors/anchors.errors";
import { AnchorsService } from "../anchors/anchors.service";

import {
  JSON_INDENTATION,
  NX_GRAPH_TYPE,
  WORKSPACE_GRAPH_PROJECT_NAME,
} from "./codependix.constants";

import type {
  CodependixCommandOptions,
  CodependixRunMode,
  DeliverFileArguments,
  NxNeighborhoodExport,
  NxWorkspaceGraphExport,
  ProjectRunResult,
} from "./codependix.types";
import type {
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
} from "@codependix/configuration";
import type { Neighborhood, NxProject, WorkspaceGraph } from "@codependix/nx";

/**
 * Builds and delivers every configured Nx neighborhood export.
 *
 * Orchestrates three collaborators that each know nothing about the others:
 * `NeighborhoodService` reads the Nx project graph and renders a diagram,
 * `ConfigurationService` resolves what each project wants exported and where,
 * and `AnchorsService` splices a Markdown export into an anchor block. This
 * service is the only place that knows how those three pieces fit together.
 */
@Injectable()
export class CodependixService {
  // 🏗 Dependency Injection

  constructor(
    private readonly anchorsService: AnchorsService,
    private readonly configurationService: ConfigurationService,
    private readonly logger: LoggerService,
    private readonly neighborhoodService: NeighborhoodService,
    private readonly workspaceGraphService: WorkspaceGraphService,
  ) {
    this.logger.setContext(CodependixService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Turns a neighborhood into the JSON shape it is exported as. */
  private buildJsonExport(neighborhood: Neighborhood): NxNeighborhoodExport {
    return {
      dependencies: neighborhood.dependencies,
      dependents: neighborhood.dependents,
      edges: neighborhood.edges,
      projectName: neighborhood.projectName,
    };
  }

  /** Splices a diagram into a named anchor block, or checks it is current. */
  private deliverAnchoredMarkdown(
    args: DeliverFileArguments & { anchorName: string },
  ): boolean {
    const resolvedPath = path.resolve(args.absoluteRoot, args.relativePath);

    if (!existsSync(resolvedPath)) {
      throw new AnchorNotFoundError(args.anchorName, resolvedPath);
    }

    const fileContent = readFileSync(resolvedPath, "utf8");

    if (args.mode === "check") {
      return this.anchorsService.checkAnchor({
        anchorName: args.anchorName,
        fileContent,
        filePath: resolvedPath,
        freshContent: args.content,
      }).isCurrent;
    }

    const updated = this.anchorsService.replaceAnchorContent({
      anchorName: args.anchorName,
      fileContent,
      filePath: resolvedPath,
      newContent: args.content,
    });

    if (updated !== fileContent) {
      writeFileSync(resolvedPath, updated, "utf8");
    }

    return true;
  }

  /** Writes or checks a whole file's rendered content. */
  private deliverFile(args: DeliverFileArguments): boolean {
    const resolvedPath = path.resolve(args.absoluteRoot, args.relativePath);

    if (args.mode === "check") {
      return this.readFileOrEmpty(resolvedPath) === args.content;
    }

    mkdirSync(path.dirname(resolvedPath), { recursive: true });
    writeFileSync(resolvedPath, args.content, "utf8");

    return true;
  }

  /** Delivers whichever destinations a project's resolved output names. */
  private deliverProject(args: {
    mode: CodependixRunMode;
    neighborhood: Neighborhood;
    project: NxProject;
    resolvedOutput: ResolvedCodependixGraphOutput;
  }): ProjectRunResult {
    const { mode, neighborhood, project, resolvedOutput } = args;
    const stalePaths: string[] = [];
    const touchesJson =
      resolvedOutput.target === "both" || resolvedOutput.target === "json";
    const touchesMarkdown =
      resolvedOutput.target === "both" || resolvedOutput.target === "markdown";

    if (touchesJson && resolvedOutput.json !== undefined) {
      this.deliverProjectJson({
        json: resolvedOutput.json,
        mode,
        neighborhood,
        project,
        stalePaths,
      });
    }

    if (touchesMarkdown && resolvedOutput.markdown !== undefined) {
      this.deliverProjectMarkdown({
        markdown: resolvedOutput.markdown,
        mode,
        neighborhood,
        project,
        stalePaths,
      });
    }

    return {
      isCurrent: stalePaths.length === 0,
      projectName: project.name,
      stalePaths,
    };
  }

  /** Delivers a project's JSON destination, recording it as stale if needed. */
  private deliverProjectJson(args: {
    json: NonNullable<ResolvedCodependixGraphOutput["json"]>;
    mode: CodependixRunMode;
    neighborhood: Neighborhood;
    project: NxProject;
    stalePaths: string[];
  }): void {
    const content = this.renderJson(this.buildJsonExport(args.neighborhood));
    const isCurrent = this.deliverFile({
      absoluteRoot: args.project.absoluteRoot,
      content,
      mode: args.mode,
      relativePath: args.json.path,
    });

    if (!isCurrent) {
      args.stalePaths.push(args.json.path);
    }
  }

  /** Delivers a project's Markdown destination, recording it as stale if needed. */
  private deliverProjectMarkdown(args: {
    markdown: NonNullable<ResolvedCodependixGraphOutput["markdown"]>;
    mode: CodependixRunMode;
    neighborhood: Neighborhood;
    project: NxProject;
    stalePaths: string[];
  }): void {
    const diagram = this.neighborhoodService.renderMermaid(args.neighborhood);
    const deliverArguments: DeliverFileArguments = {
      absoluteRoot: args.project.absoluteRoot,
      content: diagram,
      mode: args.mode,
      relativePath: args.markdown.path,
    };
    const isCurrent =
      args.markdown.anchor === undefined
        ? this.deliverFile({
            ...deliverArguments,
            content: `${diagram}\n`,
          })
        : this.deliverAnchoredMarkdown({
            ...deliverArguments,
            anchorName: args.markdown.anchor,
          });

    if (!isCurrent) {
      args.stalePaths.push(args.markdown.path);
    }
  }

  /**
   * Delivers the Workspace Graph's configured destinations, if any.
   *
   * Returns `undefined` when the resolved target is `"none"`, the same way a
   * per-project delivery is skipped entirely rather than reported current —
   * see `runNxGraphs`'s per-project loop for the equivalent reasoning.
   */
  private deliverWorkspaceGraph(args: {
    configuration: ResolvedCodependixConfiguration;
    mode: CodependixRunMode;
    workingDirectory: string;
    workspaceGraph: WorkspaceGraph;
  }): ProjectRunResult | undefined {
    const { configuration, mode, workingDirectory, workspaceGraph } = args;
    const resolvedOutput =
      this.configurationService.resolveForWorkspace(configuration);

    if (resolvedOutput.target === "none") {
      return undefined;
    }

    const stalePaths: string[] = [];
    const touchesJson =
      resolvedOutput.target === "both" || resolvedOutput.target === "json";
    const touchesMarkdown =
      resolvedOutput.target === "both" || resolvedOutput.target === "markdown";

    if (touchesJson && resolvedOutput.json !== undefined) {
      this.deliverWorkspaceJson({
        json: resolvedOutput.json,
        mode,
        stalePaths,
        workingDirectory,
        workspaceGraph,
      });
    }

    if (touchesMarkdown && resolvedOutput.markdown !== undefined) {
      this.deliverWorkspaceMarkdown({
        markdown: resolvedOutput.markdown,
        mode,
        stalePaths,
        workingDirectory,
        workspaceGraph,
      });
    }

    return {
      isCurrent: stalePaths.length === 0,
      projectName: WORKSPACE_GRAPH_PROJECT_NAME,
      stalePaths,
    };
  }

  /** Delivers the Workspace Graph's JSON destination, recording it as stale if needed. */
  private deliverWorkspaceJson(args: {
    json: NonNullable<ResolvedCodependixGraphOutput["json"]>;
    mode: CodependixRunMode;
    stalePaths: string[];
    workingDirectory: string;
    workspaceGraph: WorkspaceGraph;
  }): void {
    const content = this.renderJson(args.workspaceGraph);
    const isCurrent = this.deliverFile({
      absoluteRoot: args.workingDirectory,
      content,
      mode: args.mode,
      relativePath: args.json.path,
    });

    if (!isCurrent) {
      args.stalePaths.push(args.json.path);
    }
  }

  /** Delivers the Workspace Graph's Markdown destination, recording it as stale if needed. */
  private deliverWorkspaceMarkdown(args: {
    markdown: NonNullable<ResolvedCodependixGraphOutput["markdown"]>;
    mode: CodependixRunMode;
    stalePaths: string[];
    workingDirectory: string;
    workspaceGraph: WorkspaceGraph;
  }): void {
    const diagram = this.workspaceGraphService.renderMermaid(
      args.workspaceGraph,
    );
    const deliverArguments: DeliverFileArguments = {
      absoluteRoot: args.workingDirectory,
      content: diagram,
      mode: args.mode,
      relativePath: args.markdown.path,
    };
    const isCurrent =
      args.markdown.anchor === undefined
        ? this.deliverFile({ ...deliverArguments, content: `${diagram}\n` })
        : this.deliverAnchoredMarkdown({
            ...deliverArguments,
            anchorName: args.markdown.anchor,
          });

    if (!isCurrent) {
      args.stalePaths.push(args.markdown.path);
    }
  }

  /** Reads a file's content, or an empty string when it does not exist yet. */
  private readFileOrEmpty(filePath: string): string {
    try {
      return readFileSync(filePath, "utf8");
    } catch {
      return "";
    }
  }

  /** Renders an export as JSON the same way every run of codependix would. */
  private renderJson(
    exportedGraph: NxNeighborhoodExport | NxWorkspaceGraphExport,
  ): string {
    return `${JSON.stringify(exportedGraph, null, JSON_INDENTATION)}\n`;
  }

  // 🌎 Public Methods

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
    const mode: CodependixRunMode = options.check === true ? "check" : "write";
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
        this.deliverProject({ mode, neighborhood, project, resolvedOutput }),
      );
    }

    const workspaceGraph = this.workspaceGraphService.buildWorkspaceGraph(
      graph,
      projects,
    );
    const workspaceResult = this.deliverWorkspaceGraph({
      configuration,
      mode,
      workingDirectory,
      workspaceGraph,
    });

    return workspaceResult === undefined
      ? results
      : [...results, workspaceResult];
  }
}
