import path from "node:path";

import { Injectable } from "@nestjs/common";
import { getProjects, type Tree } from "@nx/devkit";

import {
  DEFAULT_GENERATED_OUTPUT_DIRECTORY,
  TARGET_DIRECTORY_OPTION_KEYS,
} from "./nx-adapter.constants";

import type {
  ConformetryGeneratorFactory,
  ConformetryGeneratorFactoryOptions,
  ResolveConformetryTargetDirectoryPathArguments,
} from "./nx-adapter.types";

/**
 * Creates a conformetry generator factory for Nx trees.
 */
@Injectable()
export class NxGeneratorFactoryService {
  /**
   * Resolves the project root path for the current tree.
   */
  private resolveProjectRootPath(args: {
    options: Record<string, unknown>;
    tree: Tree;
  }): string | undefined {
    const { options, tree } = args;
    const projectName = options["projectName"] ?? options["project"];

    if (typeof projectName !== "string") {
      return undefined;
    }

    const projects = getProjects(tree);
    const projectConfiguration = projects.get(projectName);

    return projectConfiguration?.root ?? projectConfiguration?.sourceRoot;
  }

  /**
   * Resolves the target directory path from explicit options or project metadata.
   */
  private resolveTargetDirectoryPathOption(
    options: Record<string, unknown>,
  ): string | undefined {
    for (const targetDirectoryOptionKey of TARGET_DIRECTORY_OPTION_KEYS) {
      const optionValue = options[targetDirectoryOptionKey];
      if (typeof optionValue === "string") {
        return optionValue;
      }
    }

    return undefined;
  }

  /**
   * Creates a conformetry generator factory for Nx trees.
   */
  public createConformetryGeneratorFactory(
    args: ConformetryGeneratorFactoryOptions,
  ): ConformetryGeneratorFactory {
    return async (tree: Tree, options: Record<string, unknown> = {}) => {
      const targetDirectoryPath = args.resolveTargetDirectoryPath
        ? await args.resolveTargetDirectoryPath({ options, tree })
        : await this.resolveConformetryTargetDirectoryPath({
            definition: args.definition,
            options,
            tree,
          });

      const normalizedInputs = this.normalizeGeneratorInputs(options);

      return async (): Promise<void> => {
        await Promise.resolve({
          normalizedInputs,
          targetDirectoryPath,
        });
      };
    };
  }

  /**
   * Normalizes runtime options into string inputs.
   */
  public normalizeGeneratorInputs(
    options: Record<string, unknown>,
  ): Record<string, string | undefined> {
    const normalizedInputs: Record<string, string | undefined> = {};

    for (const [key, value] of Object.entries(options)) {
      if (typeof value === "string") {
        normalizedInputs[key] = value;
        continue;
      }

      if (typeof value === "number" || typeof value === "boolean") {
        normalizedInputs[key] = `${value}`;
        continue;
      }

      if (value === undefined) {
        normalizedInputs[key] = undefined;
        continue;
      }

      normalizedInputs[key] = JSON.stringify(value);
    }

    return normalizedInputs;
  }

  /**
   * Resolves the target directory for generated files.
   */
  public async resolveConformetryTargetDirectoryPath(
    args: ResolveConformetryTargetDirectoryPathArguments,
  ): Promise<string> {
    const { definition, options, tree } = args;
    const directTargetDirectoryPath =
      this.resolveTargetDirectoryPathOption(options);

    if (typeof directTargetDirectoryPath === "string") {
      return await Promise.resolve(directTargetDirectoryPath);
    }

    const projectRoot = this.resolveProjectRootPath({ options, tree });

    if (typeof projectRoot === "string") {
      return await Promise.resolve(projectRoot);
    }

    return await Promise.resolve(
      path.join(DEFAULT_GENERATED_OUTPUT_DIRECTORY, definition.name),
    );
  }
}
