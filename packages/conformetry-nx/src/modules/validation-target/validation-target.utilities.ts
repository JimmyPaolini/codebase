import path from "node:path";

import { DEFAULT_VALIDATION_TARGET_NAME } from "../plugin-options/plugin-options.constants";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types";
import type { TargetConfiguration } from "@nx/devkit";

/**
 * Builds an inferred conformetry validation target for tagged projects.
 */
export function buildInferredValidationTarget(args: {
  pluginOptions?: ConformetryNxPluginRegistrationOptions;
  projectRoot: string;
  projectTags: string[];
}): Record<string, TargetConfiguration> | undefined {
  const generatorRuleNames = extractGeneratorRuleNames(args.projectTags);
  if (generatorRuleNames.length === 0) {
    return undefined;
  }

  const targetName =
    args.pluginOptions?.validationTargetName ?? DEFAULT_VALIDATION_TARGET_NAME;

  return {
    [targetName]: {
      command: `pnpm nx run codebase:conformetry-validate -- --projects=${normalizePath(args.projectRoot)} --rules=${generatorRuleNames.join(",")}`,
    },
  };
}

/**
 * Extracts conformetry generator names from project tags.
 */
export function extractGeneratorRuleNames(projectTags: string[]): string[] {
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

/**
 * Normalizes a path to slash-delimited relative notation.
 */
function normalizePath(pathValue: string): string {
  const normalizedPath = path.normalize(pathValue).replaceAll("\\", "/");
  return normalizedPath.startsWith("./")
    ? normalizedPath.slice(2)
    : normalizedPath;
}
