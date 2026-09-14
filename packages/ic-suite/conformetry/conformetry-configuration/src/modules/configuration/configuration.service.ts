import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import {
  conformetryConfigurationSchema,
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
   * Fills in the optional halves of one parsed generator entry.
   *
   * A generator with no inputs and no instances is legal — it renders a fixed
   * template nobody validates — so both default to empty rather than failing.
   */
  private applyGeneratorDefaults(
    definition: ParsedGeneratorEntry,
  ): ConformetryGeneratorDefinition {
    return {
      ...(definition.description === undefined
        ? {}
        : { description: definition.description }),
      inputs: definition.inputs ?? {},
      instances: definition.instances ?? [],
      name: definition.name,
      templatePath: definition.templatePath,
      // Deliberately not defaulted. Stamping every generator with 1 here would
      // make the generator level always beat a run-level `--threshold`, which
      // would leave that flag with nothing it could ever change.
      ...(definition.threshold === undefined
        ? {}
        : { threshold: definition.threshold }),
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
      return [];
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
    return conformetryConfigurationSchema
      .parse(configurationModule)
      .map((definition) => this.applyGeneratorDefaults(definition));
  }
}
