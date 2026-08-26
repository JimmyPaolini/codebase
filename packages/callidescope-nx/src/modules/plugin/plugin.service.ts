import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { CallidescopeService } from "@callidescope/cli";
import {
  ConfigurationService,
  DEFAULT_PREVIEW_COUNT,
} from "@callidescope/configuration";
import { MarkdownReportService } from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_NX_PLUGIN_NAME,
  PROJECT_PROGRAM_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";

import { PROJECT_CONFIGURATION_FILENAME } from "./plugin.constants";

import type {
  InferredTargets,
  InferTargetsArguments,
  ResolvedTraceScope,
  ResolveTraceScopeArguments,
  RunTraceArguments,
  RunTraceResult,
} from "./plugin.types";

/**
 * Everything this plugin does, behind one injectable.
 *
 * Nx calls plugins from module-level functions with no injection of their own,
 * so the bare entry points in `index.ts` and the executor build nothing
 * themselves — they resolve this service and hand it the arguments.
 */
@Injectable()
export class PluginService {
  // 🏗 Dependency Injection

  constructor(
    private readonly callidescopeService: CallidescopeService,
    private readonly configurationService: ConfigurationService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly optionsService: OptionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Whether a project's directory holds a TypeScript program to trace. */
  private holdsProgram(args: {
    projectRoot: string;
    workspaceRoot: string;
  }): boolean {
    return existsSync(
      path.join(args.workspaceRoot, args.projectRoot, PROJECT_PROGRAM_FILENAME),
    );
  }

  /**
   * Reads the workspace's `nx.json`, so this plugin's own registration can be
   * consulted for a configuration path an executor was not given.
   *
   * Unreadable or malformed is not an error: the caller falls back to the
   * conventional filenames, which is what a workspace with no registration
   * gets anyway.
   */
  private readNxConfiguration(workspaceRoot: string): unknown {
    try {
      return JSON.parse(
        readFileSync(path.join(workspaceRoot, "nx.json"), "utf8"),
      ) as unknown;
    } catch {
      return undefined;
    }
  }

  // 🌎 Public Methods

  /**
   * Infers a trace target onto every project holding a `tsconfig.json`.
   *
   * A project with no program of its own is skipped rather than given a target
   * that would trace nothing — `callidescope` warns and moves on, so an
   * inferred target there would be a permanently empty report. The
   * workspace-root project is skipped for the opposite reason: it contains
   * every other project, so its target would trace the whole workspace under
   * one uncacheable task.
   */
  public inferTargets(
    args: InferTargetsArguments,
  ): Map<string, InferredTargets> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const targetsByProjectRoot = new Map<string, InferredTargets>();

    for (const projectConfigurationFile of args.projectConfigurationFiles) {
      if (
        path.basename(projectConfigurationFile) !==
        PROJECT_CONFIGURATION_FILENAME
      ) {
        continue;
      }

      const projectRoot = path.dirname(projectConfigurationFile);

      if (
        projectRoot === WORKSPACE_PROJECT_ROOT ||
        !this.holdsProgram({ projectRoot, workspaceRoot: args.workspaceRoot })
      ) {
        continue;
      }

      targetsByProjectRoot.set(projectRoot, {
        [pluginOptions.traceTargetName]: {
          cache: true,
          executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:trace`,
          // The configured limits decide whether a run passes, so a cache hit
          // taken across an edit to them would report the old verdict.
          inputs: [
            "default",
            "^default",
            `{workspaceRoot}/${pluginOptions.configurationPath}`,
          ],
          options: {},
        },
      });
    }

    return targetsByProjectRoot;
  }

  /**
   * Resolves an executor's `projects`/`tags` selection into directories.
   *
   * The selection is widened along the Nx dependency graph unless asked not to
   * be — see `ProjectsService.resolveDependencyClosure` for why a trace that
   * stops at a project's own boundary measures the wrong thing.
   */
  public async resolveTraceScope(
    args: ResolveTraceScopeArguments,
  ): Promise<ResolvedTraceScope> {
    const graph = await this.projectsService.readProjectGraph();
    const selected = this.projectsService.resolveProjectNames({
      graph,
      projectNames: args.projectNames,
      tags: args.tags,
    });
    const projectNames = args.withDependencies
      ? this.projectsService.resolveDependencyClosure({
          graph,
          projectNames: selected.projectNames,
        })
      : selected.projectNames;

    return {
      directories: this.projectsService.resolveDirectories({
        graph,
        projectNames,
      }).directories,
      knownNames: selected.knownNames,
      knownTags: selected.knownTags,
      projectNames,
      unknownNames: selected.unknownNames,
      unmatchedTags: selected.unmatchedTags,
    };
  }

  /**
   * Traces the resolved directories and renders the report.
   *
   * This is the whole of the "logic on top of core callidescope": the
   * selection above is Nx's to resolve, and everything below this line is
   * callidescope's own, reached through the same services the `callidescope`
   * command uses rather than through a subprocess.
   */
  public async runTrace(args: RunTraceArguments): Promise<RunTraceResult> {
    const configurationPath =
      args.configurationPath ??
      this.optionsService.resolveConfigurationPath({
        exists: (candidatePath) =>
          existsSync(path.join(args.workspaceRoot, candidatePath)),
        nxConfiguration: this.readNxConfiguration(args.workspaceRoot),
      });
    const loaded = await this.configurationService.loadConfiguration({
      configurationPath,
      searchDirectory: args.workspaceRoot,
    });
    const configuration = {
      ...loaded,
      output: {
        ...loaded.output,
        format: args.format ?? loaded.output.format,
      },
    };

    const outcome = this.callidescopeService.trace({
      configuration,
      directories: args.directories,
      workspaceRoot: args.workspaceRoot,
    });

    return {
      ok:
        outcome.result.deepStacks.length === 0 &&
        outcome.result.wideCallables.length === 0,
      report: this.markdownReportService.renderRun({
        previewCount:
          configuration.output.projectReadmes?.previewCount ??
          DEFAULT_PREVIEW_COUNT,
        rendering:
          configuration.output.format === "mermaid" ? "diagram" : "tree",
        result: outcome.result,
      }),
    };
  }
}
