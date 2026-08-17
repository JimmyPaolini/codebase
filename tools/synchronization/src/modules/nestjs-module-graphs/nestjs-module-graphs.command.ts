import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationService } from "../synchronization/synchronization.service";

import { NestjsModuleGraphsMarkersService } from "./nestjs-module-graphs-markers.service";
import {
  NESTJS_MODULE_GRAPH_MARKER,
  NESTJS_MODULE_GRAPH_TARGET_FILES,
} from "./nestjs-module-graphs.constants";
import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type { NestjsProject } from "./nestjs-module-graphs.types";

/**
 * CLI command that syncs each NestJS project's module graph into the marker
 * block of its own markdown files.
 *
 * The graph is derived from the `@Module` metadata rather than from prose, so
 * a module that gains or loses an import shows up in the diagram on the next
 * run instead of whenever someone remembers to redraw it.
 */
@Command({
  description: "Run the nestjs-module-graphs command",
  name: "nestjs-module-graphs",
})
@Injectable()
export class NestjsModuleGraphsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly markersService: NestjsModuleGraphsMarkersService,
    private readonly moduleGraphsService: NestjsModuleGraphsService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(NestjsModuleGraphsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "nestjs-module-graphs";

  // 🔏 Private Methods

  /** Logs a one-line summary of the run and reports whether it was clean. */
  private reportResults(
    projectCount: number,
    outOfSyncFiles: string[],
  ): boolean {
    if (outOfSyncFiles.length === 0) {
      this.logger.log("🕸️ Verified every NestJS module graph", undefined, {
        projects: projectCount,
      });
      return true;
    }

    this.logger.log("🕸️ Detected out-of-sync NestJS module graphs", undefined, {
      files: outOfSyncFiles,
      hint: "Run 'nx run synchronization:synchronize:write' to sync",
    });
    return false;
  }

  /**
   * Checks or rewrites one markdown file's graph block.
   *
   * A file without markers is drift rather than an error: it names a project
   * whose graph nobody has made room for yet, and the message says which.
   */
  private synchronizeFile(options: {
    diagram: string;
    file: string;
    mode: SynchronizationMode;
  }): boolean {
    const { diagram, file, mode } = options;
    const relativeFile = path.relative(process.cwd(), file);
    const content = readFileSync(file, "utf8");
    const existing = this.markersService.extractContent(
      content,
      NESTJS_MODULE_GRAPH_MARKER,
    );

    if (existing === undefined) {
      this.logger.log(
        `🕸️ Missing ${this.markersService.getStartMarker(NESTJS_MODULE_GRAPH_MARKER)} markers in ${relativeFile}`,
      );
      return false;
    }

    if (existing.trim() === diagram.trim()) return true;
    if (mode === "check") {
      this.logger.log(
        `🕸️ Detected an out-of-sync module graph in ${relativeFile}`,
      );
      return false;
    }

    writeFileSync(
      file,
      this.markersService.replaceContent(
        content,
        NESTJS_MODULE_GRAPH_MARKER,
        diagram,
      ),
      "utf8",
    );
    this.logger.log(`🕸️ Updated the module graph in ${relativeFile}`);

    return true;
  }

  /** Explores one project and syncs its graph into every target markdown file. */
  private async synchronizeProject(
    project: NestjsProject,
    mode: SynchronizationMode,
  ): Promise<string[]> {
    const graph = await this.moduleGraphsService.exploreProject(project);
    const diagram = this.moduleGraphsService.renderMermaid(graph);

    this.logger.log(`🕸️ Explored ${project.name}`, undefined, {
      edges: graph.edges.length,
      modules: graph.moduleNames.length,
    });

    return NESTJS_MODULE_GRAPH_TARGET_FILES.filter(
      (fileName) =>
        !this.synchronizeFile({
          diagram,
          file: path.join(project.absoluteRoot, fileName),
          mode,
        }),
    ).map((fileName) => path.join(project.name, fileName));
  }

  // 🌎 Public Methods

  /** Runs the nestjs-module-graphs sync command in check or write mode. */
  async run(
    passedParameters: string[],
    _options?: Record<string, unknown>,
  ): Promise<void> {
    const mode =
      this.synchronizationModeService.resolveSynchronizationModeOrExit({
        invalidModeLabel: "Invalid mode",
        loggerService: this.logger,
        passedParameters,
        usageMessage:
          "💡 Usage: nx run synchronization:start:nestjs-module-graphs-check (or synchronization:start:nestjs-module-graphs-write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes every project's module graph and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      const projects = this.moduleGraphsService.discoverProjects(process.cwd());
      const outOfSyncFiles: string[] = [];

      for (const project of projects) {
        outOfSyncFiles.push(...(await this.synchronizeProject(project, mode)));
      }

      return this.reportResults(projects.length, outOfSyncFiles);
    } catch (error) {
      this.logger.error(
        "💥 Failed synchronizing NestJS module graphs",
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
