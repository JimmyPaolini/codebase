import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";

import {
  codependixConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXPORT_TARGET,
  DEFAULT_INCLUDE_GLOBS,
  DEFAULT_MARKDOWN_PATH,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";

import type {
  CodependixConfiguration,
  CodependixGraphOutput,
  LoadConfigurationArguments,
  ResolvedCodependixConfiguration,
  ResolvedCodependixGraphOutput,
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

  // 🌎 Public Methods

  /**
   * Whether a project participates in graph export at all.
   *
   * A project matches when at least one include glob claims its name and no
   * exclude glob does — the same rule `codometer`'s file discovery applies to
   * paths, applied here to project names instead.
   */
  public isProjectIncluded(
    projectName: string,
    configuration: ResolvedCodependixConfiguration,
  ): boolean {
    return (
      this.matchesAnyGlob(projectName, configuration.include) &&
      !this.matchesAnyGlob(projectName, configuration.exclude)
    );
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
      return this.resolveConfiguration({});
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
  ): ResolvedCodependixConfiguration {
    return {
      defaults: configuration.defaults ?? {},
      exclude: configuration.exclude ?? [],
      include: configuration.include ?? [...DEFAULT_INCLUDE_GLOBS],
      projects: configuration.projects ?? {},
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
    const { configuration, graphType, projectName } = args;

    if (!this.isProjectIncluded(projectName, configuration)) {
      return { json: undefined, markdown: undefined, target: "none" };
    }

    const projectOutput = configuration.projects[projectName]?.[graphType];
    const defaultOutput = configuration.defaults[graphType];

    return this.resolveGraphOutput(projectOutput ?? defaultOutput);
  }
}
