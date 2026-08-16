import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  codometerConfigurationSchema,
  CONFIGURATION_FILE_NAMES,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  REPOSITORY_ROOT_MARKERS,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";

import type {
  CodometerConfiguration,
  CodometerOutputConfiguration,
  LoadConfigurationArguments,
  ResolvedCodometerConfiguration,
  ResolvedCodometerJsonOutputConfiguration,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "./configuration.types";

/**
 * Loads, validates, and normalizes codometer configuration files.
 *
 * This service owns loading only. What the configuration means — which files
 * an exclusion glob removes, where a badge block is spliced in — belongs to
 * the analyzers that read it, so that reading a configuration file stays free
 * of any knowledge of the repository being measured.
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
   * finding one: a repository that never wrote a configuration file is
   * measured with the defaults rather than told to write one.
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
   * the command was invoked from a nested directory, which is what a task
   * runner does whenever it sets the cwd to the project rather than the
   * workspace.
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

  /**
   * Resolves a configuration path against the cwd, then the repository root.
   */
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

  /** Applies defaults to the JSON output destination, if one was named. */
  private resolveJsonOutput(
    output: CodometerOutputConfiguration | undefined,
  ): ResolvedCodometerJsonOutputConfiguration | undefined {
    if (output?.json === undefined) {
      return undefined;
    }

    return {
      indentation: output.json.indentation ?? DEFAULT_JSON_INDENTATION,
      path: output.json.path,
    };
  }

  /** Applies defaults to the markdown output destination, if one was named. */
  private resolveMarkdownOutput(
    output: CodometerOutputConfiguration | undefined,
  ): ResolvedCodometerMarkdownOutputConfiguration | undefined {
    if (output?.markdown === undefined) {
      return undefined;
    }

    const { markdown } = output;

    return {
      description: markdown.description,
      endMarker: markdown.endMarker ?? DEFAULT_MARKDOWN_END_MARKER,
      path: markdown.path,
      // Left unset rather than defaulted: the built-in rendering and writing
      // live in the CLI that calls them, so "unset" is what selects them.
      render: markdown.render,
      startMarker: markdown.startMarker ?? DEFAULT_MARKDOWN_START_MARKER,
      write: markdown.write,
    };
  }

  // 🌎 Public Methods

  /**
   * Loads and validates a codometer configuration file.
   *
   * A path that was named explicitly must exist — a typo in a task runner's
   * arguments should fail rather than quietly measure the repository with
   * defaults it never asked for. A path that was not named is searched for,
   * and its absence is legal.
   */
  public async loadConfiguration(
    args: LoadConfigurationArguments = {},
  ): Promise<ResolvedCodometerConfiguration> {
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
      codometerConfigurationSchema.parse(configurationModule),
    );
  }

  /**
   * Fills in every field a configuration file may leave out.
   *
   * Exposed so a host embedding codometer can hand over a configuration object
   * it assembled itself and get the same shape a configuration file produces.
   */
  public resolveConfiguration(
    configuration: CodometerConfiguration,
  ): ResolvedCodometerConfiguration {
    return {
      // Additive rather than a replacement: the defaults are directories no
      // repository wants counted, so a configuration naming its own noise
      // should not have to restate them to keep them out.
      exclude: [
        ...new Set([
          ...DEFAULT_EXCLUDE_GLOBS,
          ...(configuration.exclude ?? []),
        ]),
      ],
      excludeFrom: configuration.excludeFrom ?? [],
      output: {
        json: this.resolveJsonOutput(configuration.output),
        markdown: this.resolveMarkdownOutput(configuration.output),
      },
      python: {
        command: configuration.python?.command ?? DEFAULT_PYTHON_COMMAND,
      },
    };
  }
}
