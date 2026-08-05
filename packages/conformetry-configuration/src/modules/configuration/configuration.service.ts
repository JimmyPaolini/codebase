import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Injectable } from "@nestjs/common";
import { createJiti } from "jiti";
import { parse as parseJsonc } from "jsonc-parser";

import { conformetryConfigurationSchema } from "../../constants.js";

import {
  supportedExtensions,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants.js";

import type {
  ConformetryConfiguration,
  ConformetryGeneratorDefinition,
  ParsedConformetryGeneratorDefinition,
} from "./configuration.types.js";
import type { z } from "zod";

/**
 * Loads and validates conformetry configuration files.
 */
@Injectable()
export class ConfigurationService {
  /**
   * Finds the nearest workspace root from the current process directory.
   */
  private async findWorkspaceRoot(): Promise<string | undefined> {
    const currentDirectory = process.cwd();
    let candidateDirectory = path.resolve(currentDirectory);

    for (;;) {
      const workspaceManifestPath = path.join(
        candidateDirectory,
        "pnpm-workspace.yaml",
      );

      try {
        await access(workspaceManifestPath);
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

  /**
   * Checks whether a value matches the required generator definition shape.
   */
  private isConformetryGeneratorDefinition(
    value: unknown,
  ): value is ParsedConformetryGeneratorDefinition {
    return (
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      "parameters" in value &&
      typeof value.name === "string" &&
      typeof value.parameters === "object" &&
      value.parameters !== null
    );
  }

  /**
   * Loads a config module from the supported file extensions.
   */
  private async loadConfigurationModule(
    configurationPath: string,
    extension: string,
  ): Promise<unknown> {
    if (extension === ".json" || extension === ".jsonc") {
      return this.loadJsonConfiguration(configurationPath, extension);
    }

    const jiti = createJiti(fileURLToPath(import.meta.url));
    const importedModule: unknown = await jiti.import(configurationPath, {
      default: true,
    });

    if (typeof importedModule === "object" && importedModule !== null) {
      const defaultExport = (importedModule as { default?: unknown }).default;

      if (typeof defaultExport === "object" && defaultExport !== null) {
        return defaultExport;
      }

      return importedModule;
    }

    return { generators: {} };
  }

  /**
   * Loads a JSON or JSONC configuration file.
   */
  private async loadJsonConfiguration(
    configurationPath: string,
    extension: string,
  ): Promise<unknown> {
    const configurationContent = await readFile(configurationPath, "utf8");

    if (extension === ".jsonc") {
      return parseJsonc(configurationContent);
    }

    return JSON.parse(configurationContent);
  }

  /**
   * Resolves a configuration path against the current workspace if needed.
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

    if (existsSync(workspaceRelativePath)) {
      return workspaceRelativePath;
    }

    return absolutePath;
  }

  /**
   * Loads a conformetry configuration from a local file path.
   */
  public async loadConformetryConfiguration(
    configurationPath: string,
  ): Promise<ConformetryConfiguration> {
    const normalizedConfigurationPath =
      await this.resolveConfigurationPath(configurationPath);
    const extension = path.extname(normalizedConfigurationPath).toLowerCase();

    if (!supportedExtensions.has(extension)) {
      throw new UnknownConfigurationFileTypeError(normalizedConfigurationPath);
    }

    const configurationModule = await this.loadConfigurationModule(
      normalizedConfigurationPath,
      extension,
    );

    const parsedConfiguration: z.infer<typeof conformetryConfigurationSchema> =
      conformetryConfigurationSchema.parse(configurationModule);

    const generators: Record<string, ConformetryGeneratorDefinition> = {};

    for (const [generatorName, generatorDefinition] of Object.entries(
      parsedConfiguration.generators,
    )) {
      if (!this.isConformetryGeneratorDefinition(generatorDefinition)) {
        continue;
      }

      generators[generatorName] = {
        ...(generatorDefinition.aliases === undefined
          ? {}
          : { aliases: generatorDefinition.aliases }),
        ...(generatorDefinition.description === undefined
          ? {}
          : { description: generatorDefinition.description }),
        ...(generatorDefinition.hooks === undefined
          ? {}
          : { hooks: generatorDefinition.hooks }),
        name: generatorDefinition.name,
        parameters: generatorDefinition.parameters,
        templateDirectoryPath: path.join(
          "configuration",
          "conformetry-templates",
          generatorName,
        ),
      };
    }

    return { generators };
  }
}
