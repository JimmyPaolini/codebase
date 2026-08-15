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
      ...(definition.aliases === undefined
        ? {}
        : { aliases: definition.aliases }),
      ...(definition.description === undefined
        ? {}
        : { description: definition.description }),
      inputs: definition.inputs ?? {},
      instances: definition.instances ?? [],
      name: definition.name,
      templatePath: definition.templatePath,
    };
  }

  /**
   * Fails when two generators would answer to the same thing.
   *
   * A host resolves `<name-or-alias>` by taking the *first* generator whose
   * name or alias matches, so a collision does not error there — it silently
   * shadows, and the losing generator becomes unreachable while still
   * appearing in the configuration. Two generators sharing a template collide
   * differently: validation then finds candidates that fit both equally and
   * reports them as matching nothing.
   */
  private assertNoCollisions(definitions: ConformetryConfiguration): void {
    const problems = [
      ...this.findDuplicates({
        definitions,
        // Names and aliases share one namespace because a host searches both
        // at once: an alias equal to another generator's name is as ambiguous
        // as two equal names. A generator aliasing its own name is redundant
        // rather than ambiguous, so it counts once.
        describe: (key, owners) =>
          `"${key}" is the name or alias of more than one generator: ${owners.join(", ")}. A host resolves the first match, leaving the others unreachable.`,
        keysOf: (definition) => [
          ...new Set([definition.name, ...(definition.aliases ?? [])]),
        ],
      }),
      ...this.findDuplicates({
        definitions,
        describe: (key, owners) =>
          `${key} is the template of more than one generator: ${owners.join(", ")}. Validation cannot tell which one a matching instance belongs to.`,
        keysOf: (definition) => [definition.templatePath],
      }),
      ...this.findUnusableHandles(definitions),
    ];

    if (problems.length > 0) {
      throw new Error(problems.join("\n"));
    }
  }

  /** Reports every key more than one generator claims. */
  private findDuplicates(args: {
    definitions: ConformetryConfiguration;
    describe: (key: string, owners: string[]) => string;
    keysOf: (definition: ConformetryGeneratorDefinition) => string[];
  }): string[] {
    const owners = new Map<string, string[]>();

    for (const definition of args.definitions) {
      for (const key of args.keysOf(definition)) {
        owners.set(key, [...(owners.get(key) ?? []), definition.name]);
      }
    }

    return [...owners.entries()]
      .filter(([, names]) => names.length > 1)
      .map(([key, names]) => args.describe(key, names));
  }

  /** Reports names and aliases that could not be addressed or emitted. */
  private findUnusableHandles(definitions: ConformetryConfiguration): string[] {
    return definitions.flatMap((definition) => {
      return [definition.name, ...(definition.aliases ?? [])]
        .filter((handle) => handle === "" || handle !== path.basename(handle))
        .map(
          (handle) =>
            `Generator ${definition.name} uses "${handle}" as a name or alias. A generator is addressed by that text and emitted to a file named after it, so it cannot contain a path separator.`,
        );
    });
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
    const definitions = conformetryConfigurationSchema
      .parse(configurationModule)
      .map((definition) => this.applyGeneratorDefaults(definition));

    this.assertNoCollisions(definitions);

    return definitions;
  }
}
