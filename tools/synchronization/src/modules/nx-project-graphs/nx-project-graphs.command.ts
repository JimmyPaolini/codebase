import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { SynchronizationMarkersService } from "../synchronization/synchronization-markers.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import {
  NX_PROJECT_GRAPH_MARKER,
  NX_PROJECT_GRAPH_TARGET_FILE,
} from "./nx-project-graphs.constants";
import { NxProjectGraphsService } from "./nx-project-graphs.service";

import type {
  SynchronizableCommand,
  SynchronizationMode,
} from "../synchronization/synchronization.types";
import type {
  NxProject,
  NxProjectGraphNeighborhood,
} from "./nx-project-graphs.types";

/**
 * CLI command that syncs each project's place in the Nx project graph into its
 * README.
 *
 * This is the level above the NestJS module graph: what a project needs from
 * the workspace, and who would break if it changed.
 *
 * Deprecated: superseded by `packages/codependix-nx`'s whole-workspace graph
 * export, which codependix's own anchor blocks now carry — see issue #296.
 * Not tagged with an actual `@deprecated` JSDoc tag, because this command
 * stays fully wired and tested as its own Nx target rather than deleted (a
 * later, separate cleanup); a real `@deprecated` tag would flag every one of
 * those still-legitimate internal references — including this class's own
 * `this.logger.setContext(NxProjectGraphsCommand.name)` — under this
 * workspace's `@typescript-eslint/no-deprecated` rule.
 */
@Command({
  description: "Run the nx-project-graphs command",
  name: "nx-project-graphs",
})
@Injectable()
export class NxProjectGraphsCommand
  extends CommandRunner
  implements SynchronizableCommand
{
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly markersService: SynchronizationMarkersService,
    private readonly projectGraphsService: NxProjectGraphsService,
    private readonly synchronizationModeService: SynchronizationService,
  ) {
    super();
    this.logger.setContext(NxProjectGraphsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly synchronizationLabel = "nx-project-graphs";

  // 🔏 Private Methods

  /** Reports drift in check mode, or rewrites the block in write mode. */
  private applyMode(options: {
    content: string;
    diagram: string;
    file: string;
    mode: SynchronizationMode;
    relativeFile: string;
  }): boolean {
    const { content, diagram, file, mode, relativeFile } = options;

    if (mode === "check") {
      this.logger.info("🧭 Detected an out-of-sync project graph", undefined, {
        path: relativeFile,
      });
      return false;
    }

    writeFileSync(
      file,
      this.markersService.replaceContent(
        content,
        NX_PROJECT_GRAPH_MARKER,
        diagram,
      ),
      "utf8",
    );
    this.logger.info("🧭 Updated the project graph", undefined, {
      path: relativeFile,
    });

    return true;
  }

  /** Logs a one-line summary of the run and reports whether it was clean. */
  private reportResults(
    projectCount: number,
    outOfSyncFiles: string[],
  ): boolean {
    if (outOfSyncFiles.length === 0) {
      this.logger.info("🧭 Verified every Nx project graph", undefined, {
        projects: projectCount,
      });
      return true;
    }

    this.logger.info("🧭 Detected out-of-sync Nx project graphs", undefined, {
      files: outOfSyncFiles,
      hint: "Run 'nx run synchronization:nx-project-graphs:write' to sync",
    });
    return false;
  }

  /** Checks or rewrites one project's README graph block. */
  private synchronizeProject(options: {
    mode: SynchronizationMode;
    neighborhood: NxProjectGraphNeighborhood | undefined;
    project: NxProject;
  }): boolean {
    const { mode, neighborhood, project } = options;
    const file = path.join(project.absoluteRoot, NX_PROJECT_GRAPH_TARGET_FILE);

    if (neighborhood === undefined || !existsSync(file)) return true;

    const diagram = this.projectGraphsService.renderMermaid(neighborhood);
    const relativeFile = path.relative(process.cwd(), file);
    const content = readFileSync(file, "utf8");
    const existing = this.markersService.extractContent(
      content,
      NX_PROJECT_GRAPH_MARKER,
    );

    if (existing === undefined) {
      this.logger.info("🧭 Missing markers", undefined, {
        marker: this.markersService.getStartMarker(NX_PROJECT_GRAPH_MARKER),
        path: relativeFile,
      });
      return false;
    }

    if (existing.trim() === diagram.trim()) return true;

    return this.applyMode({ content, diagram, file, mode, relativeFile });
  }

  // 🌎 Public Methods

  /** Runs the nx-project-graphs sync command in check or write mode. */
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
          "💡 Usage: nx run synchronization:nx-project-graphs:check (or synchronization:nx-project-graphs:write)",
      });

    if (!(await this.synchronize(mode))) {
      process.exit(1);
    }
  }

  /** Synchronizes every project's graph and reports success without exiting. */
  async synchronize(mode: SynchronizationMode): Promise<boolean> {
    try {
      this.logger.debug("🔍 Reading the Nx project graph");
      const graph = await this.projectGraphsService.readProjectGraph();
      const projects = this.projectGraphsService.readProjects(
        graph,
        process.cwd(),
      );
      const neighborhoods = this.projectGraphsService.buildNeighborhoods(
        graph,
        projects,
      );
      const outOfSyncFiles: string[] = [];

      for (const project of projects) {
        const targetFile = path.join(
          project.name,
          NX_PROJECT_GRAPH_TARGET_FILE,
        );

        try {
          const inSync = this.synchronizeProject({
            mode,
            neighborhood: neighborhoods.get(project.name),
            project,
          });
          if (!inSync) outOfSyncFiles.push(targetFile);
        } catch (error) {
          this.logger.error(
            "💥 Failed synchronizing a project's graph",
            undefined,
            {
              project: project.name,
              reason: error instanceof Error ? error.message : String(error),
            },
          );
          outOfSyncFiles.push(targetFile);
        }
      }

      return this.reportResults(projects.length, outOfSyncFiles);
    } catch (error) {
      this.logger.error(
        "💥 Failed synchronizing Nx project graphs",
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
