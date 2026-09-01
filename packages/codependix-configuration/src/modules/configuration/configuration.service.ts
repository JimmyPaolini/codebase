import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";

import {
  codependixConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  ConfigurationFileNotFoundError,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_INCLUDE_GLOBS,
  DEFAULT_MARKDOWN_PATH,
  REPOSITORY_ROOT_MARKERS,
  SELECTION_SEPARATOR,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";

import type {
  CodependixBoundariesConfiguration,
  CodependixConfiguration,
  CodependixGraphOutput,
  CodependixSelectionArguments,
  LoadConfigurationArguments,
  ProjectSelectionArguments,
  ResolvedCodependixBoundariesConfiguration,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
  ResolvedCodependixSelection,
  ResolveForProjectArguments,
} from "./configuration.types";

/**
 * Loads, validates, and resolves codependix configuration files.
 *
 * Loading and per-project resolution are kept apart on purpose: a project's
 * actual export configuration depends on both the global defaults and its own
 * name, so resolving it eagerly for every project in the workspace would mean
 * redoing that work for a workspace whose graphs run against a filtered subset
 * of projects. `resolveForProject` is called once per project that is
 * actually built instead.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Walks upward from a directory looking for a configuration file.
   *
   * Returns `undefined` when the search reaches the filesystem root without
   * finding one: a workspace that never wrote a configuration file resolves
   * every graph to `target: "none"` rather than being told to write one.
   */
  private findConfigurationFile(searchDirectory: string): string | undefined {
    let candidateDirectory = path.resolve(searchDirectory);

    for (;;) {
      for (const fileName of CONFIGURATION_FILE_NAMES) {
        const candidatePath = path.join(candidateDirectory, fileName);

        if (existsSync(candidatePath)) {
          return candidatePath;
        }
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /**
   * Walks upward from the process cwd looking for the workspace root.
   *
   * Used to resolve a configuration path given relative to that root even when
   * the command was invoked from a nested directory, which is what a task
   * runner does whenever it sets the cwd to a project rather than the
   * workspace.
   */
  private findWorkspaceRoot(): string | undefined {
    let candidateDirectory = path.resolve(process.cwd());

    for (;;) {
      const directory = candidateDirectory;
      const isRoot = REPOSITORY_ROOT_MARKERS.some((marker) =>
        existsSync(path.join(directory, marker)),
      );

      if (isRoot) {
        return candidateDirectory;
      }

      const parentDirectory = path.dirname(candidateDirectory);

      if (parentDirectory === candidateDirectory) {
        return undefined;
      }

      candidateDirectory = parentDirectory;
    }
  }

  /** Whether `--projects` or `--tags` names a project. */
  private isProjectNamedOnCommandLine(
    args: ProjectSelectionArguments,
  ): boolean {
    const { selection } = args.configuration;

    return (
      this.matchesAnyName(
        args.projectName,
        args.projectRoot,
        selection.projects,
      ) || (args.projectTags ?? []).some((tag) => selection.tags.includes(tag))
    );
  }

  /** Loads a configuration module, choosing the reader by extension. */
  private async loadConfigurationModule(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    if (args.extension === ".json") {
      return JSON.parse(await readFile(args.configurationPath, "utf8"));
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));

    return this.readDefaultExport(
      await jiti.import(args.configurationPath, { default: true }),
    );
  }

  /** Whether a project's name matches at least one of a list of globs. */
  private matchesAnyGlob(projectName: string, globs: string[]): boolean {
    return globs.some((glob) => path.matchesGlob(projectName, glob));
  }

  /** Whether a project's name or its root matches at least one glob. */
  private matchesAnyName(
    projectName: string,
    projectRoot: string | undefined,
    globs: string[],
  ): boolean {
    return (
      this.matchesAnyGlob(projectName, globs) ||
      (projectRoot !== undefined && this.matchesAnyGlob(projectRoot, globs))
    );
  }

  /**
   * Reads what a configuration module exported, through either interop shape.
   */
  private readDefaultExport(importedModule: unknown): unknown {
    if (typeof importedModule !== "object" || importedModule === null) {
      return {};
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /**
   * Fills in the four graph levels a `boundaries` block may leave out.
   *
   * Every level resolves to a list rather than to `undefined`, so a caller
   * walks all four without asking which ones were configured — the same
   * reason `include` resolves to a list nobody wrote.
   */
  private resolveBoundaries(
    boundaries: CodependixBoundariesConfiguration | undefined,
  ): ResolvedCodependixBoundariesConfiguration {
    return {
      imports: boundaries?.imports ?? [],
      nestjs: boundaries?.nestjs ?? [],
      nx: boundaries?.nx ?? [],
      pythonImports: boundaries?.pythonImports ?? [],
    };
  }

  /**
   * Resolves a configuration path against the cwd, then the workspace root.
   */
  private resolveConfigurationPath(configurationPath: string): string {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const workspaceRoot = this.findWorkspaceRoot();

    if (workspaceRoot === undefined) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    const rootRelativePath = path.resolve(workspaceRoot, configurationPath);

    if (!existsSync(rootRelativePath)) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    return rootRelativePath;
  }

  /** Applies defaults to one graph type's export configuration. */
  private resolveGraphOutput(
    output: CodependixGraphOutput | undefined,
  ): ResolvedCodependixGraphOutput {
    const target = output?.target ?? DEFAULT_EXPORT_TARGET;
    const markdown = output?.markdown;

    return {
      json: output?.json === undefined ? undefined : { path: output.json.path },
      markdown:
        markdown === undefined
          ? undefined
          : {
              anchor: markdown.anchor,
              path: markdown.path ?? DEFAULT_MARKDOWN_PATH,
            },
      target,
    };
  }

  /**
   * Splits the `--projects` and `--tags` arguments into lists.
   *
   * Empty entries are dropped, so a trailing comma and a doubled one are both
   * read as the author meant them rather than as a glob matching nothing.
   */
  private resolveSelection(
    selection: CodependixSelectionArguments | undefined,
  ): ResolvedCodependixSelection {
    return {
      projects: this.splitSelectionArgument(selection?.projects),
      tags: this.splitSelectionArgument(selection?.tags),
    };
  }

  /** Splits one comma-separated argument, trimming and dropping blanks. */
  private splitSelectionArgument(argument: string | undefined): string[] {
    return (argument ?? "")
      .split(SELECTION_SEPARATOR)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  // 🌎 Public Methods

  /**
   * Whether a project participates in graph export at all.
   *
   * A project matches when something claims it — an `include` glob, a
   * `--projects` glob, or a `--tags` tag — and no `exclude` glob claims its
   * name or root. The command line **widens** what the configuration already
   * selects rather than replacing it; `exclude` wins over all three, because
   * a flag that could resurrect an excluded project would make `exclude`
   * advisory.
   *
   * `projectRoot` and `projectTags` are optional: a caller with neither handy
   * still resolves against globs written against project names.
   */
  public isProjectIncluded(args: ProjectSelectionArguments): boolean {
    const { configuration, projectName, projectRoot } = args;
    const isIncluded =
      this.matchesAnyName(projectName, projectRoot, configuration.include) ||
      this.isProjectNamedOnCommandLine(args);
    const isExcluded = this.matchesAnyName(
      projectName,
      projectRoot,
      configuration.exclude,
    );

    return isIncluded && !isExcluded;
  }

  /**
   * Whether a project is in the set a run's command line narrowed to.
   *
   * A run naming no selection selects **everything**, which is what keeps the
   * whole-workspace graph and the boundary gate judging every project by
   * default. Naming one narrows both to what it named.
   *
   * This is where `--projects`/`--tags` differ from `include`: `include` is
   * about which projects have exports written for them, and never reaches the
   * workspace graph or the gate. A selection reaches all three.
   */
  public isProjectSelected(args: ProjectSelectionArguments): boolean {
    const { selection } = args.configuration;

    if (selection.projects.length === 0 && selection.tags.length === 0) {
      return true;
    }

    return this.isProjectNamedOnCommandLine(args);
  }

  /**
   * Loads and validates a codependix configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly resolving every graph to
   * `target: "none"`. A path that was not named is searched for from the
   * search directory upward, and its absence is legal.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCodependixConfiguration> {
    const searchDirectory = path.resolve(args.searchDirectory ?? process.cwd());
    const resolvedPath =
      args.configurationPath === undefined
        ? this.findConfigurationFile(searchDirectory)
        : this.resolveConfigurationPath(args.configurationPath);

    if (resolvedPath === undefined) {
      return this.resolveConfiguration({}, args.selection);
    }

    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configurationModule = await this.loadConfigurationModule({
      configurationPath: resolvedPath,
      extension,
    });

    return this.resolveConfiguration(
      codependixConfigurationSchema.parse(configurationModule),
      args.selection,
    );
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding codependix can hand over a configuration
   * object it assembled itself and get the same shape a configuration file
   * produces.
   */
  public resolveConfiguration(
    configuration: CodependixConfiguration,
    selection?: CodependixSelectionArguments,
  ): ResolvedCodependixConfiguration {
    return {
      boundaries: this.resolveBoundaries(configuration.boundaries),
      defaults: configuration.defaults ?? {},
      exclude: configuration.exclude ?? [],
      include: configuration.include ?? [...DEFAULT_INCLUDE_GLOBS],
      projectGraph: configuration.projectGraph,
      projects: configuration.projects ?? {},
      selection: this.resolveSelection(selection),
      workspace: configuration.workspace ?? {},
    };
  }

  /**
   * Resolves one project's export configuration for one graph type.
   *
   * A project's own override, when it names one for this graph type, replaces
   * the default outright rather than being merged field by field with it — a
   * project turning its Markdown export off by omitting `markdown` should not
   * have the default's `markdown` destination resurface underneath it. A
   * project excluded by the configured globs always resolves to
   * `target: "none"`, regardless of what either configuration would otherwise
   * say, since a project excluded from graph export should not need every
   * override it might otherwise inherit rewritten to `"none"` by hand.
   */
  public resolveForProject(
    args: ResolveForProjectArguments,
  ): ResolvedCodependixGraphOutput {
    const { configuration, graphType, projectName, projectRoot, projectTags } =
      args;

    if (
      !this.isProjectIncluded({
        configuration,
        projectName,
        projectRoot,
        projectTags,
      })
    ) {
      return { json: undefined, markdown: undefined, target: "none" };
    }

    const projectOutput = configuration.projects[projectName]?.[graphType];
    const defaultOutput = configuration.defaults[graphType];

    return this.resolveGraphOutput(projectOutput ?? defaultOutput);
  }

  /**
   * Resolves the Workspace Graph's export configuration.
   *
   * The Workspace Graph is exported once for the whole repository rather than
   * once per project, so it has no per-project override and is unaffected by
   * `include`/`exclude` — those two apply only to `resolveForProject`.
   *
   * `--projects` and `--tags` do reach it, through the node set rather than
   * through this: a run naming a selection draws the graph over the projects
   * it named. Where that graph lands is still read from `workspace.nx`.
   */
  public resolveForWorkspace(
    configuration: ResolvedCodependixConfiguration,
  ): ResolvedCodependixGraphOutput {
    return this.resolveGraphOutput(configuration.workspace.nx);
  }
}
