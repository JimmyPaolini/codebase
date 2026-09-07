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
} from "./plugin.types";
import type {
  CallGraphResult,
  ResolvedCallidescopeConfiguration,
  WideCallableFinding,
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

  /**
   * Names the callables that called more things directly than their project
   * allows.
   *
   * A line each rather than the report's table: the gate's product is the list
   * of things to go and fix, and every one of them carries the limit it broke
   * because that number is per project now and cannot be inferred from the
   * run.
   */
  private describeWideCallables(
    findings: readonly WideCallableFinding[],
  ): string {
    if (findings.length === 0) {
      return "None.";
    }

    return findings
      .map(
        (finding) =>
          `- \`${finding.displayName}\` — ${String(finding.breadth)} direct callees, limit ${String(finding.limit)} (${finding.location.filePath})`,
      )
      .join("\n");
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

  /**
   * Renders the two findings a gate weighs, and nothing else.
   *
   * A gate prints why it decided rather than what it read. The full report is
   * what the trace target is for, and burying two deep stacks in a listing of
   * every stack in the project is how a failed pipeline stops being read.
   */
  private renderFindings(args: {
    previewCount: number;
    result: CallGraphResult;
  }): string {
    const { deepStacks, wideCallables } = args.result;

    return [
      `## Call stacks over the depth limit (${String(deepStacks.length)})`,
      "",
      this.markdownReportService.renderStacks({
        previewCount: args.previewCount,
        stacks: deepStacks,
      }),
      "",
      `## Callables over the breadth limit (${String(wideCallables.length)})`,
      "",
      this.describeWideCallables(wideCallables),
    ].join("\n");
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
   * **Depth is gated always, breadth wherever a limit exists.** Not two modes
   * to be selected between: `maximumDepth` has a default, so every project has
   * a number and every project is judged by it, while `maximumBreadth` has
   * none at any level — so a project that declared no breadth limit is judged
   * against `Infinity` and can produce no breadth finding to fail on. Reading
   * the findings rather than asking for a check by name is what keeps that
   * true without a decision: a gate here cannot be refused for wanting to
   * check breadth in a project that never asked for it, which is what
   * `--check breadth` does at a prompt, and cannot silently stop gating depth
   * either.
   *
   * A run that traced nothing is deliberately **not** failed, unlike the
   * `callidescope` command's own gate. That rule guards a run pointed at a
   * whole workspace, where reading nothing means the trace itself is broken;
   * a project can legitimately hold a `tsconfig.json` and almost no source of
   * its own — the `*-agents` packages ship skills — and failing one for what
   * it is rather than for what it did is a red gate nobody can act on. A
   * project whose source really is excluded to nothing gets no gate at all,
   * which is the case that rule would have caught here.
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
    const { deepStacks, wideCallables } = outcome.result;

    return {
      ok: deepStacks.length === 0 && wideCallables.length === 0,
      report: this.renderFindings({
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

    return {
      ok:
        outcome.result.deepStacks.length === 0 &&
        outcome.result.wideCallables.length === 0,
      report: this.markdownReportService.renderRun({
        previewCount: this.readPreviewCount(configuration),
        rendering:
          configuration.output.format === "mermaid" ? "diagram" : "tree",
        result: outcome.result,
      }),
    };
  }
}
