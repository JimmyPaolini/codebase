import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  conformetryConfigurationSchema,
  DEFAULT_TEMPLATE_DIRECTORY,
  SUPPORTED_CONFIGURATION_EXTENSIONS,
  UnknownConfigurationFileTypeError,
  WORKSPACE_MANIFEST_FILENAME,
} from "./configuration.constants";

import type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ParsedGeneratorEntry,
} from "./configuration.types";

/**
 * Loads and validates conformetry configuration files.
 *
 * This service owns loading only — resolving templates, matching them to
 * projects, and preparing documents for validation all live in the discovery
 * module, so that reading a config file stays free of filesystem walking.
 */
@Injectable()
export class ConfigurationService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Applies defaults to one parsed generator entry.
   *
   * An explicitly configured `templateDirectoryPath` wins; otherwise the path
   * is derived from the registry key, which is the common case and keeps
   * configs terse.
   */
  private applyGeneratorDefaults(args: {
    definition: ParsedGeneratorEntry;
    generatorName: string;
  }): ConformetryGeneratorDefinition {
    const { definition } = args;

    return {
      ...(definition.aliases === undefined
        ? {}
        : { aliases: definition.aliases }),
      ...(definition.description === undefined
        ? {}
        : { description: definition.description }),
      ...(definition.hooks === undefined ? {} : { hooks: definition.hooks }),
      name: definition.name,
      parameters: definition.parameters ?? {},
      templateDirectoryPath:
        definition.templateDirectoryPath ??
        path.join(DEFAULT_TEMPLATE_DIRECTORY, args.generatorName),
    };
  }

  /**
   * Walks upward from the process cwd looking for the workspace manifest.
   *
   * Used to resolve a config path given relative to the workspace root even
   * when the command was invoked from a nested directory.
   */
  private async findWorkspaceRoot(): Promise<string | undefined> {
    let candidateDirectory = path.resolve(process.cwd());

    for (;;) {
      try {
        await access(
          path.join(candidateDirectory, WORKSPACE_MANIFEST_FILENAME),
        );
        return candidateDirectory;
      } catch {
        const parentDirectory = path.dirname(candidateDirectory);

        if (parentDirectory === candidateDirectory) {
          return undefined;
        }

        candidateDirectory = parentDirectory;
      }
    }
  }

  /** Loads a config module, choosing the reader by extension. */
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
      return { generators: {} };
    }

    const defaultExport = (importedModule as { default?: unknown }).default;

    return typeof defaultExport === "object" && defaultExport !== null
      ? defaultExport
      : importedModule;
  }

  /** Reads a JSON or JSONC config file. */
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
   * Resolves a config path against the cwd, falling back to the workspace root.
   */
  private async resolveConfigurationPath(
    configurationPath: string,
  ): Promise<string> {
    const absolutePath = path.resolve(configurationPath);

    if (existsSync(absolutePath)) {
      return absolutePath;
    }

    const workspaceRoot = await this.findWorkspaceRoot();

    if (workspaceRoot === undefined) {
      return absolutePath;
    }

    const workspaceRelativePath = path.resolve(
      workspaceRoot,
      configurationPath,
    );

    return existsSync(workspaceRelativePath)
      ? workspaceRelativePath
      : absolutePath;
  }

  // 🌎 Public Methods

  /**
   * Loads, validates, and normalizes a conformetry configuration file.
   *
   * Throws `UnknownConfigurationFileTypeError` for an unreadable extension, and
   * propagates the Zod error for a malformed registry — a bad config should
   * fail loudly rather than silently validate nothing.
   */
  public async loadConformetryConfiguration(
    configurationPath: string,
  ): Promise<ConformetryConfiguration> {
    const resolvedPath = await this.resolveConfigurationPath(configurationPath);
    const extension = path.extname(resolvedPath).toLowerCase();

    if (!SUPPORTED_CONFIGURATION_EXTENSIONS.has(extension)) {
      throw new UnknownConfigurationFileTypeError(resolvedPath);
    }

    const configurationModule = await this.loadConfigurationModule({
      configurationPath: resolvedPath,
      extension,
    });
    const parsedConfiguration =
      conformetryConfigurationSchema.parse(configurationModule);
    const generators: Record<string, ConformetryGeneratorDefinition> = {};

    for (const [generatorName, definition] of Object.entries(
      parsedConfiguration.generators,
    )) {
      generators[generatorName] = this.applyGeneratorDefaults({
        definition,
        generatorName,
      });
    }

    return { generators };
  }
}
