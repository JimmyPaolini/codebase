import path from "node:path";

import { DEFAULT_VALIDATION_TARGET_NAME } from "../plugin-options/plugin-options.constants.js";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types.js";
import type { TargetConfiguration } from "@nx/devkit";

/**
 * Builds inferred validation targets for conformetry-tagged projects.
 */
export class ValidationTargetService {
  /**
   * Normalizes filesystem paths for command-line arguments.
   */
  private normalizePath(pathValue: string): string {
    const normalizedPath = path.normalize(pathValue).replaceAll("\\", "/");
    return normalizedPath.startsWith("./")
      ? normalizedPath.slice(2)
      : normalizedPath;
  }

  /**
   * Builds an inferred conformetry validation target for tagged projects.
   */
  public buildInferredValidationTarget(args: {
    pluginOptions?: ConformetryNxPluginRegistrationOptions;
    projectRoot: string;
    projectTags: string[];
  }): Record<string, TargetConfiguration> | undefined {
    const generatorRuleNames = this.extractGeneratorRuleNames(args.projectTags);
    if (generatorRuleNames.length === 0) {
      return undefined;
    }

    const targetName =
      args.pluginOptions?.validationTargetName ??
      DEFAULT_VALIDATION_TARGET_NAME;

    return {
      [targetName]: {
        command: `pnpm nx run codebase:conformetry-validate -- --projects=${this.normalizePath(args.projectRoot)} --rules=${generatorRuleNames.join(",")}`,
      },
    };
  }

  /**
   * Extracts conformetry generator names from project tags.
   */
  public extractGeneratorRuleNames(projectTags: string[]): string[] {
    const generatorRuleNames = new Set<string>();

    for (const projectTag of projectTags) {
      if (!projectTag.startsWith("generator:")) {
        continue;
      }

      const generatorRuleName = projectTag.slice("generator:".length);
      if (generatorRuleName.length > 0) {
        generatorRuleNames.add(generatorRuleName);
      }
    }

    return [...generatorRuleNames].toSorted();
  }
}
