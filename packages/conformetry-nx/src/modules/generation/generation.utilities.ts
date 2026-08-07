import {
  normalizeRuntimeOptions,
  resolveTargetDirectoryPath,
} from "@jimmypaolini/conformetry-configuration";
import { getProjects } from "@nx/devkit";

import { runGenerateCommand } from "../command-execution/command-execution.utilities";
import {
  resolveConformetryConfigurationPath,
  resolveConformetryNxPluginOptions,
} from "../plugin-options/plugin-options.utilities";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types";
import type { GeneratorCallback, Tree } from "@nx/devkit";

/**
 * Builds passedParameters for GenerateCommand.run from normalized options.
 */
export function buildGeneratePassedParameters(args: {
  generatorInputs: Record<string, string | undefined>;
  name: string;
  targetDirectoryPath: string;
}): string[] {
  const passedParameters = [
    "generate",
    "--name",
    args.name,
    "--directory",
    args.targetDirectoryPath,
  ];

  for (const [optionName, optionValue] of Object.entries(
    args.generatorInputs,
  )) {
    if (
      optionValue === undefined ||
      optionName === "config" ||
      optionName === "name" ||
      optionName === "targetDirectoryPath"
    ) {
      continue;
    }

    passedParameters.push(`--${toKebabCase(optionName)}`, optionValue);
  }

  return passedParameters;
}

/**
 * Runs a conformetry generator via the conformetry GenerateCommand runtime.
 */
export async function runConformetryGenerator(args: {
  generatorName: string;
  options: Record<string, unknown>;
  pluginOptions?: ConformetryNxPluginRegistrationOptions;
  tree: Tree;
}): Promise<GeneratorCallback> {
  const normalizedPluginOptions = resolveConformetryNxPluginOptions(
    args.pluginOptions,
  );
  const configurationPath = await resolveConformetryConfigurationPath({
    options: args.options,
    pluginOptions: normalizedPluginOptions,
  });
  const targetDirectoryPath = await resolveTargetDirectoryPath({
    generatorName: args.generatorName,
    options: args.options,
    resolveProjectRootPath: ({ projectName }) => {
      const projectConfiguration = getProjects(args.tree).get(projectName);
      return projectConfiguration?.root ?? projectConfiguration?.sourceRoot;
    },
  });
  const generatorInputs = normalizeRuntimeOptions(args.options);

  await runGenerateCommand({
    configurationPath,
    generatorName: args.generatorName,
    passedParameters: buildGeneratePassedParameters({
      generatorInputs,
      name: args.generatorName,
      targetDirectoryPath,
    }),
    targetDirectoryPath,
  });

  return async (): Promise<void> => {};
}

/**
 * Converts camelCase option names to kebab-case.
 */
function toKebabCase(value: string): string {
  return value.replaceAll(/([a-z0-9])([A-Z])/gu, "$1-$2").toLowerCase();
}
