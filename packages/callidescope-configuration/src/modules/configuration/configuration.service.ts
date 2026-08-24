import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  callidescopeConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_ALLOW_SPREAD_FOR,
  DEFAULT_CALLER_MAJORITY_RATIO,
  DEFAULT_DIRECT_SPREAD_THRESHOLD,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_MAXIMUM_DEPTH,
  DEFAULT_MAXIMUM_IMPLEMENTATION_CANDIDATES,
  DEFAULT_MINIMUM_CALLERS,
  DEFAULT_MODULES_DIRECTORY,
  DEFAULT_OUTPUT_FORMAT,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_PROJECT_CONTAINER_DIRECTORIES,
  DEFAULT_PROJECT_README_HEADING,
  DEFAULT_ROOT_MODULE_SEGMENT,
  DEFAULT_SPREAD_THRESHOLD,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";

import type {
  CallidescopeConfiguration,
  CallidescopeEntryPoints,
  CallidescopeLimits,
  CallidescopeMarkdownOutputConfiguration,
  CallidescopeOutputConfiguration,
  CallidescopeWorkspaceStructure,
  LoadConfigurationArguments,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeEntryPoints,
  ResolvedCallidescopeJsonOutputConfiguration,
  ResolvedCallidescopeLimits,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
  ResolvedCallidescopeWorkspaceStructure,
} from "./configuration.types";

/**
 * Loads, validates, and normalizes callidescope configuration files.
 *
 * This service owns loading only. What the configuration means — which files an
 * exclusion glob removes, which decorator marks a stack root — belongs to the
 * analyzers that read it, so that reading a configuration file stays free of any
 * knowledge of the repository being traced.
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
   * finding one: a repository that never wrote a configuration file is traced
   * with the defaults rather than told to write one.
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
   * Walks upward from the process cwd looking for the repository root.
   *
   * Used to resolve a configuration path given relative to that root even when
   * the command was invoked from a nested directory, which is what a task runner
   * does whenever it sets the cwd to the project rather than the workspace.
   */
  private findRepositoryRoot(): string | undefined {
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
    if (args.extension === ".json" || args.extension === ".jsonc") {
      return this.loadJsonConfiguration(args);
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));
    const importedModule: unknown = await jiti.import(args.configurationPath, {
      default: true,
    });

    if (typeof importedModule !== "object" || importedModule === null) {
      return {};
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /** Reads a JSON or JSONC configuration file. */
  private async loadJsonConfiguration(args: {
    configurationPath: string;
    extension: string;
  }): Promise<unknown> {
    const configurationContent = await readFile(args.configurationPath, "utf8");

    return args.extension === ".jsonc"
      ? parseJsonc(configurationContent)
      : JSON.parse(configurationContent);
  }

  /** Resolves a configuration path against the cwd, then the repository root. */
  private resolveConfigurationPath(configurationPath: string): string {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const repositoryRoot = this.findRepositoryRoot();

    if (repositoryRoot === undefined) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    const repositoryRelativePath = path.resolve(
      repositoryRoot,
      configurationPath,
    );

    if (!existsSync(repositoryRelativePath)) {
      throw new ConfigurationFileNotFoundError(absolutePath);
    }

    return repositoryRelativePath;
  }

  /**
   * Applies defaults to the entry-point rules.
   *
   * The authored object is defaulted to an empty one up front rather than
   * optional-chained per field, which keeps this to one branch per option
   * instead of two.
   */
  private resolveEntryPoints(
    entryPoints: CallidescopeEntryPoints | undefined,
  ): ResolvedCallidescopeEntryPoints {
    const authored = entryPoints ?? {};

    return {
      decorators: authored.decorators ?? [...DEFAULT_ENTRY_POINT_DECORATORS],
      includeExportedFunctions: authored.includeExportedFunctions ?? true,
      includeOrphans: authored.includeOrphans ?? true,
      includeTests: authored.includeTests ?? false,
    };
  }

  /** Applies defaults to the JSON output destination, if one was named. */
  private resolveJsonOutput(
    output: CallidescopeOutputConfiguration | undefined,
  ): ResolvedCallidescopeJsonOutputConfiguration | undefined {
    if (output?.json === undefined) {
      return undefined;
    }

    return {
      indentation: output.json.indentation ?? DEFAULT_JSON_INDENTATION,
      path: output.json.path,
    };
  }

  /** Applies defaults to every threshold. */
  private resolveLimits(
    limits: CallidescopeLimits | undefined,
  ): ResolvedCallidescopeLimits {
    const authored = limits ?? {};

    return {
      callerMajorityRatio:
        authored.callerMajorityRatio ?? DEFAULT_CALLER_MAJORITY_RATIO,
      directSpreadThreshold:
        authored.directSpreadThreshold ?? DEFAULT_DIRECT_SPREAD_THRESHOLD,
      maximumBreadth: authored.maximumBreadth,
      maximumDepth: authored.maximumDepth ?? DEFAULT_MAXIMUM_DEPTH,
      maximumImplementationCandidates:
        authored.maximumImplementationCandidates ??
        DEFAULT_MAXIMUM_IMPLEMENTATION_CANDIDATES,
      minimumCallers: authored.minimumCallers ?? DEFAULT_MINIMUM_CALLERS,
      spreadThreshold: authored.spreadThreshold ?? DEFAULT_SPREAD_THRESHOLD,
    };
  }

  /**
   * Applies defaults to one anchored markdown destination, if it was named.
   *
   * Shared by `markdown` and `mermaid`: the two differ in what is written
   * between the anchors, and in nothing this resolves.
   */
  private resolveMarkdownDestination(
    destination: CallidescopeMarkdownOutputConfiguration | undefined,
  ): ResolvedCallidescopeMarkdownOutputConfiguration | undefined {
    if (destination === undefined) {
      return undefined;
    }

    return {
      description: destination.description,
      endMarker: destination.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path: destination.path,
      // Left unset rather than defaulted: the built-in rendering and writing
      // live in the CLI that calls them, so "unset" is what selects them.
      render: destination.render,
      startMarker: destination.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      write: destination.write,
    };
  }

  /** Applies defaults to the project README destination, if it was asked for. */
  private resolveProjectReadmes(
    output: CallidescopeOutputConfiguration | undefined,
  ): ResolvedCallidescopeProjectReadmeConfiguration | undefined {
    if (output?.projectReadmes === undefined) {
      return undefined;
    }

    const { projectReadmes } = output;

    return {
      endMarker: projectReadmes.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      heading: projectReadmes.heading ?? DEFAULT_PROJECT_README_HEADING,
      previewCount: projectReadmes.previewCount ?? DEFAULT_PREVIEW_COUNT,
      startMarker: projectReadmes.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
    };
  }

  /**
   * Applies defaults to the workspace's directory layout.
   *
   * Defaults to this tool's own repository layout, so a project that never
   * configures this keeps tracing the way it always has.
   */
  private resolveWorkspaceStructure(
    workspaceStructure: CallidescopeWorkspaceStructure | undefined,
  ): ResolvedCallidescopeWorkspaceStructure {
    const authored = workspaceStructure ?? {};

    return {
      modulesDirectory: authored.modulesDirectory ?? DEFAULT_MODULES_DIRECTORY,
      projectContainerDirectories: authored.projectContainerDirectories ?? [
        ...DEFAULT_PROJECT_CONTAINER_DIRECTORIES,
      ],
      rootModuleSegment:
        authored.rootModuleSegment ?? DEFAULT_ROOT_MODULE_SEGMENT,
    };
  }

  // 🌎 Public Methods

  /**
   * Loads and validates a callidescope configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly trace the repository with defaults
   * it never asked for. A path that was not named is searched for, and its
   * absence is legal.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCallidescopeConfiguration> {
    const resolvedPath =
      args.configurationPath === undefined
        ? this.findConfigurationFile(args.searchDirectory ?? process.cwd())
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
      callidescopeConfigurationSchema.parse(configurationModule),
    );
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding callidescope can hand over a configuration
   * object it assembled itself and get the same shape a configuration file
   * produces.
   */
  public resolveConfiguration(
    configuration: CallidescopeConfiguration,
  ): ResolvedCallidescopeConfiguration {
    return {
      allowSpreadFor: configuration.allowSpreadFor ?? [
        ...DEFAULT_ALLOW_SPREAD_FOR,
      ],
      entryPoints: this.resolveEntryPoints(configuration.entryPoints),
      // Additive rather than a replacement: the defaults are directories no
      // repository wants traced, so a configuration naming its own noise should
      // not have to restate them to keep them out.
      exclude: [
        ...new Set([
          ...DEFAULT_EXCLUDE_GLOBS,
          ...(configuration.exclude ?? []),
        ]),
      ],
      excludeFrom: configuration.excludeFrom ?? [],
      ignoreCallees: configuration.ignoreCallees ?? [],
      limits: this.resolveLimits(configuration.limits),
      output: {
        format: configuration.output?.format ?? DEFAULT_OUTPUT_FORMAT,
        json: this.resolveJsonOutput(configuration.output),
        markdown: this.resolveMarkdownDestination(
          configuration.output?.markdown,
        ),
        mermaid: this.resolveMarkdownDestination(configuration.output?.mermaid),
        projectReadmes: this.resolveProjectReadmes(configuration.output),
      },
      projects: configuration.projects ?? [],
      workspaceStructure: this.resolveWorkspaceStructure(
        configuration.workspaceStructure,
      ),
    };
  }
}
