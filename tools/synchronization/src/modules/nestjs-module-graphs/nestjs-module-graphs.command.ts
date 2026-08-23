import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationMarkersService } from "../synchronization/synchronization-markers.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";
import {
  NESTJS_MODULE_GRAPH_MARKER,
  NESTJS_MODULE_GRAPH_TARGET_FILES,
} from "./nestjs-module-graphs.constants";
import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type {
  NestjsModuleOwnership,
  NestjsProject,
} from "./nestjs-module-graphs.types";

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
    private readonly graphService: NestjsModuleGraphsGraphService,
    private readonly logger: LoggerService,
    private readonly markersService: SynchronizationMarkersService,
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
      this.logger.info("🕸️ Verified every NestJS module graph", undefined, {
        projects: projectCount,
      });
      return true;
    }

    this.logger.info(
      "🕸️ Detected out-of-sync NestJS module graphs",
      undefined,
      {
        files: outOfSyncFiles,
        hint: "Run 'nx run synchronization:nestjs-module-graphs:write' to publish",
      },
    );
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
      this.logger.info("🕸️ Missing markers", undefined, {
        marker: this.markersService.getStartMarker(NESTJS_MODULE_GRAPH_MARKER),
        path: relativeFile,
      });
      return false;
    }

    if (existing.trim() === diagram.trim()) return true;
    if (mode === "check") {
      this.logger.info("🕸️ Detected an out-of-sync module graph", undefined, {
        path: relativeFile,
      });
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
    this.logger.info("🕸️ Updated the module graph", undefined, {
      path: relativeFile,
    });

    return true;
  }

  /** Explores one project and syncs its graph into every target markdown file. */
  private async synchronizeProject(options: {
    mode: SynchronizationMode;
    ownership: NestjsModuleOwnership;
    project: NestjsProject;
  }): Promise<string[]> {
    const { mode, ownership, project } = options;
    const graph = await this.moduleGraphsService.exploreProject(
      project,
      ownership,
    );
    const diagram = this.graphService.renderMermaid(graph);

    this.logger.info("🕸️ Explored a project's module graph", undefined, {
      ambient: graph.ambientModuleNames,
      edges: graph.edges.length,
      modules: graph.moduleNames.length,
      project: project.name,
    });

    // A document a project does not keep is not drift. Which documents a
    // project must keep is conformetry's rule, not this command's, and the
    // markers live in the templates so it can enforce them.
    return NESTJS_MODULE_GRAPH_TARGET_FILES.filter((fileName) => {
      const file = path.join(project.absoluteRoot, fileName);

      return existsSync(file) && !this.synchronizeFile({ diagram, file, mode });
    }).map((fileName) => path.join(project.name, fileName));
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
          "💡 Usage: nx run synchronization:nestjs-module-graphs:check (or synchronization:nestjs-module-graphs:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes every project's module graph and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      this.logger.debug("🔍 Discovering NestJS projects");
      const projects = this.moduleGraphsService.discoverProjects(process.cwd());
      const ownership = this.moduleGraphsService.indexModuleOwners(projects);
      const outOfSyncFiles: string[] = [];

      for (const project of projects) {
        try {
          outOfSyncFiles.push(
            ...(await this.synchronizeProject({ mode, ownership, project })),
          );
        } catch (error) {
          this.logger.error(
            "💥 Failed exploring a project's module graph",
            undefined,
            {
              project: project.name,
              reason: error instanceof Error ? error.message : String(error),
            },
          );
          outOfSyncFiles.push(project.name);
        }
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
