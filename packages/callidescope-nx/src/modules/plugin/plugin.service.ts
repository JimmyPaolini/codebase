import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { CallidescopeService } from "@callidescope/cli";
import {
  ConfigurationService,
  DEFAULT_PREVIEW_COUNT,
} from "@callidescope/configuration";
import { FileFilterService } from "@callidescope/graph";
import { MarkdownReportService } from "@callidescope/output";
import { Injectable } from "@nestjs/common";

import {
  CALLIDESCOPE_NX_PLUGIN_NAME,
  PROJECT_PROGRAM_FILENAME,
  WORKSPACE_PROJECT_ROOT,
} from "../options/options.constants";
import { OptionsService } from "../options/options.service";
import { ProjectsService } from "../projects/projects.service";

import {
  EMPTY_TRACE_REPORT,
  PROJECT_CONFIGURATION_FILENAME,
  PROJECT_LIMITS_INPUT,
} from "./plugin.constants";

import type { CallidescopePluginOptions } from "../options/options.types";
import type {
  InferredTargets,
  InferTargetsArguments,
  ResolvedTraceScope,
  ResolveTraceScopeArguments,
  RunGateArguments,
  RunTraceArguments,
  RunTraceResult,
  RunVerdict,
} from "./plugin.types";
import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
} from "@callidescope/configuration";
import type { FileFilter } from "@callidescope/graph";

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
    private readonly fileFilterService: FileFilterService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly optionsService: OptionsService,
    private readonly projectsService: ProjectsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Builds the predicate deciding which projects the workspace configuration
   * keeps out of every trace.
   *
   * The run's own filter, built from the same two fields
   * `WorkspaceService.discoverProjects` builds it from and asked the same
   * question it asks — is this project's `tsconfig.json` excluded — so
   * inference and discovery can never come to disagree about which projects a
   * run covers.
   *
   * A configuration that cannot be loaded excludes nothing. This runs while Nx
   * is building the project graph, where a thrown error stops every command in
   * the workspace rather than one task; the executor loads the same file again
   * and refuses there, which is where a refusal is about the run that asked
   * for it.
   */
  private async buildExclusionFilter(args: {
    configurationPath: string;
    workspaceRoot: string;
  }): Promise<FileFilter> {
    try {
      const { configuration } =
        await this.configurationService.loadConfigurationFile({
          configurationPath: args.configurationPath,
          searchDirectory: args.workspaceRoot,
        });

      return this.fileFilterService.buildFileFilter({
        exclude: configuration.exclude,
        excludeFrom: configuration.excludeFrom,
        workspaceRoot: args.workspaceRoot,
      });
    } catch {
      return { isExcluded: (): boolean => false };
    }
  }

  /**
   * Builds one project's targets, gate included unless it is excluded.
   *
   * An excluded project gets the three that print something and not the one
   * that decides an exit code. Its own code is never traced — discovery drops
   * it before its `tsconfig.json` is opened — so a gate here would judge the
   * project's *dependencies* and report green for a project it never read.
   * `packages/callidescope-examples` is the case: its fixtures exist to breach
   * the limits, which is why `.callidescopeignore` names it.
   */
  private buildInferredTargets(args: {
    isExcluded: boolean;
    pluginOptions: CallidescopePluginOptions;
  }): InferredTargets {
    const { pluginOptions } = args;
    // The configured limits decide whether a run passes, so a cache hit taken
    // across an edit to them would report the old verdict. A dependency's
    // sources join them because the trace follows the Nx graph into them —
    // which is also what carries a dependency's own limits, since `^default`
    // reaches every file at its root.
    const inputs = [
      "default",
      "^default",
      `{workspaceRoot}/${pluginOptions.configurationPath}`,
    ];
    const targets: InferredTargets = {
      [pluginOptions.breadthTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:breadth`,
        inputs,
        options: {},
      },
      [pluginOptions.depthTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:depth`,
        inputs,
        options: {},
      },
      [pluginOptions.traceTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:trace`,
        inputs,
        options: {},
      },
    };

    if (args.isExcluded) {
      return targets;
    }

    return {
      ...targets,
      [pluginOptions.gateTargetName]: {
        cache: true,
        executor: `${CALLIDESCOPE_NX_PLUGIN_NAME}:gate`,
        inputs: [...inputs, PROJECT_LIMITS_INPUT],
        options: {},
      },
    };
  }

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
   * Whether the workspace configuration excludes this project outright.
   *
   * The project's own `tsconfig.json` is the path asked about, because that is
   * the path `WorkspaceService.discoverProjects` asks about — a project is
   * excluded when the file that makes it a project is.
   *
   * Joined with `path.posix` rather than `path.join`, unlike `holdsProgram`
   * beside it: a filter matches the workspace-relative POSIX paths git and the
   * exclusion globs are written in, where `holdsProgram` hands a native
   * absolute path to `existsSync`.
   */
  private isExcludedProject(args: {
    fileFilter: FileFilter;
    projectRoot: string;
  }): boolean {
    return args.fileFilter.isExcluded(
      path.posix.join(args.projectRoot, PROJECT_PROGRAM_FILENAME),
    );
  }

  /**
   * Decides whether a traced result passes, for every target that reads one.
   *
   * One predicate rather than the same expression written beside each caller,
   * so a rule added here cannot reach one verdict and miss the other — which
   * is exactly what the empty-trace rule below would have done.
   *
   * **A run that read nothing fails.** `callidescope`'s own
   * `reportEmptyTrace` fails the same case for the same reason: a gate that
   * passes because it never looked reports the project as clean and leaves
   * nothing in the output to say otherwise. It is not a theoretical case here
   * — a project's own `callidescope.config.*` may write an `exclude`, and one
   * that over-matches would turn that project's gate permanently and silently
   * green.
   *
   * **Depth is judged always, breadth wherever a limit exists.** Not two modes
   * to be selected between: `maximumDepth` has a default, so every project has
   * a number and every project is judged by it, while `maximumBreadth` has
   * none at any level — so a project that declared no breadth limit is judged
   * against `Infinity` and can produce no breadth finding to fail on. Reading
   * the findings rather than asking for a check by name is what keeps that
   * true without a decision: a verdict here cannot be refused for wanting to
   * check breadth in a project that never asked for it, which is what
   * `--check breadth` does at a prompt, and cannot silently stop judging depth
   * either.
   */
  private judge(result: CallGraphResult): RunVerdict {
    if (result.summary.callableCount === 0) {
      return { ok: false, reason: EMPTY_TRACE_REPORT };
    }

    return {
      ok: result.deepStacks.length === 0 && result.wideCallables.length === 0,
      reason: undefined,
    };
  }

  /**
   * Resolves and loads the configuration one run is judged by.
   *
   * The file-aware load rather than the plain one: a run resolves a
   * configuration beside every project it reaches, and skips whichever file is
   * already serving as this run's own. The path the loader settled on is what
   * comes back, never the one it was handed, since a search may have answered
   * instead.
   */
  private async loadRunConfiguration(args: {
    configurationPath?: string | undefined;
    workspaceRoot: string;
  }): Promise<{
    configuration: ResolvedCallidescopeConfiguration;
    path: string | undefined;
  }> {
    const configurationPath =
      args.configurationPath ??
      this.optionsService.resolveConfigurationPath({
        exists: (candidatePath) =>
          existsSync(path.join(args.workspaceRoot, candidatePath)),
        nxConfiguration: this.readNxConfiguration(args.workspaceRoot),
      });
    const loaded = await this.configurationService.loadConfigurationFile({
      configurationPath,
      searchDirectory: args.workspaceRoot,
    });

    return { configuration: loaded.configuration, path: loaded.path };
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

  /** How many stacks a rendering shows before the rest are folded away. */
  private readPreviewCount(
    configuration: ResolvedCallidescopeConfiguration,
  ): number {
    return (
      configuration.output.projectReadmes?.previewCount ?? DEFAULT_PREVIEW_COUNT
    );
  }

  // 🌎 Public Methods

  /**
   * States what a selection asked for that the workspace does not have.
   *
   * Both kinds of mistake are named at once, each beside the vocabulary it
   * was drawn from, so a command line with two typos in it is two typos to
   * fix rather than two runs.
   */
  public describeRefusedScope(scope: ResolvedTraceScope): string {
    return [
      scope.unknownNames.length > 0
        ? `Unknown Nx projects: ${scope.unknownNames.join(", ")}. Known: ${scope.knownNames.join(", ")}.`
        : undefined,
      scope.unmatchedTags.length > 0
        ? `Unmatched Nx tags: ${scope.unmatchedTags.join(", ")}. Known: ${scope.knownTags.join(", ")}.`
        : undefined,
    ]
      .filter((reason) => reason !== undefined)
      .join(" ");
  }

  /**
   * Infers this plugin's targets onto every project holding a `tsconfig.json`.
   *
   * A project with no program of its own is skipped rather than given a target
   * that would trace nothing — `callidescope` warns and moves on, so an
   * inferred target there would be a permanently empty report. The
   * workspace-root project is skipped for the opposite reason: it contains
   * every other project, so its target would trace the whole workspace under
   * one uncacheable task.
   *
   * Asynchronous because the gate is only inferred onto a project the
   * workspace configuration does not exclude, and only that file can say which
   * projects those are — see `buildExclusionFilter`, which is read once here
   * rather than once per project for the same reason the plugin options are.
   */
  public async inferTargets(
    args: InferTargetsArguments,
  ): Promise<Map<string, InferredTargets>> {
    const pluginOptions = this.optionsService.resolvePluginOptions(
      args.options,
    );
    const fileFilter = await this.buildExclusionFilter({
      configurationPath: pluginOptions.configurationPath,
      workspaceRoot: args.workspaceRoot,
    });
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

      targetsByProjectRoot.set(
        projectRoot,
        this.buildInferredTargets({
          isExcluded: this.isExcludedProject({ fileFilter, projectRoot }),
          pluginOptions,
        }),
      );
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
   * Traces the resolved directories and judges what it found against the
   * limits every project in scope declared.
   *
   * The verdict is `judge`'s, which is where the rules are written; this
   * chooses what to print for it. A run that read nothing prints the reason
   * instead of the findings, because it has no finding to show and a bare red
   * task would leave a reader guessing why a project that looks fine failed.
   */
  public async runGate(args: RunGateArguments): Promise<RunTraceResult> {
    const { configuration, path: configurationPath } =
      await this.loadRunConfiguration(args);
    const outcome = await this.callidescopeService.trace({
      configuration,
      configurationPath,
      directories: args.directories,
      workspaceRoot: args.workspaceRoot,
    });
    const verdict = this.judge(outcome.result);

    return {
      ok: verdict.ok,
      report:
        verdict.reason ??
        this.markdownReportService.renderFindings({
          previewCount: this.readPreviewCount(configuration),
          result: outcome.result,
        }),
    };
  }

  /**
   * Traces the resolved directories and renders the report.
   *
   * This is the whole of the "logic on top of core callidescope": the
   * selection above is Nx's to resolve, and everything below this line is
   * callidescope's own, reached through the same services the `callidescope`
   * command uses rather than through a subprocess.
   *
   * Judged by the same predicate the gate is, so the two targets cannot come
   * to disagree about what a passing run is. A run that read nothing keeps its
   * report and gains the reason underneath it: a summary table of zeroes is
   * what happened, not why it failed.
   */
  public async runTrace(args: RunTraceArguments): Promise<RunTraceResult> {
    const { configuration: loaded, path: loadedPath } =
      await this.loadRunConfiguration(args);
    const configuration = {
      ...loaded,
      output: {
        ...loaded.output,
        format: args.format ?? loaded.output.format,
      },
    };

    const outcome = await this.callidescopeService.trace({
      configuration,
      configurationPath: loadedPath,
      directories: args.directories,
      workspaceRoot: args.workspaceRoot,
    });

    const verdict = this.judge(outcome.result);
    const report = this.markdownReportService.renderRun({
      previewCount: this.readPreviewCount(configuration),
      rendering: configuration.output.format === "mermaid" ? "diagram" : "tree",
      result: outcome.result,
    });

    return {
      ok: verdict.ok,
      report:
        verdict.reason === undefined ? report : `${report}\n${verdict.reason}`,
    };
  }
}
