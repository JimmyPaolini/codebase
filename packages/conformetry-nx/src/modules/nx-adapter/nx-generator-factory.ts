import path from "node:path";

import { type GeneratorCallback, getProjects, type Tree } from "@nx/devkit";

import { NxFileSystemAdapter } from "./nx-file-system-adapter";
import { NxFormatterAdapter } from "./nx-formatter-adapter";
import {
  GenerationRuntimeService,
  type GeneratorDefinition,
} from "./nx-generation-runtime";
import { NxPathMatcher } from "./nx-path-matcher";

/**
 * A generator callback compatible with Nx generator factories.
 */
export type ConformetryGeneratorFactory = (
  tree: Tree,
  options?: Record<string, unknown>,
) => Promise<GeneratorCallback>;

/**
 * Creates a generator factory that renders templates into an Nx tree.
 */
export interface ConformetryGeneratorFactoryOptions {
  definition: GeneratorDefinition;
  resolveTargetDirectoryPath?: (args: {
    options: Record<string, unknown>;
    tree: Tree;
  }) => Promise<string> | string;
}

/**
 * Creates a conformetry generator factory for Nx trees.
 */
const noopGeneratorCallback: GeneratorCallback = async (): Promise<void> => {};

/**
 * Creates a conformetry generator factory for Nx trees.
 */
export function createConformetryGeneratorFactory(
  args: ConformetryGeneratorFactoryOptions,
): ConformetryGeneratorFactory {
  const runtime = new GenerationRuntimeService();

  return async (tree: Tree, options: Record<string, unknown> = {}) => {
    const targetDirectoryPath = args.resolveTargetDirectoryPath
      ? await args.resolveTargetDirectoryPath({ options, tree })
      : await resolveConformetryTargetDirectoryPath({
          definition: args.definition,
          options,
          tree,
        });

    const normalizedInputs = normalizeGeneratorInputs(options);

    await runtime.runGenerator({
      definition: args.definition,
      filesystem: new NxFileSystemAdapter(tree),
      formatter: new NxFormatterAdapter(),
      inputs: normalizedInputs,
      pathMatcher: new NxPathMatcher(),
      targetDirectoryPath,
    });

    return noopGeneratorCallback;
  };
}

/**
 * Resolves the target directory for generated files.
 */
export async function resolveConformetryTargetDirectoryPath(args: {
  definition: GeneratorDefinition;
  options: Record<string, unknown>;
  tree: Tree;
}): Promise<string> {
  const { definition, options, tree } = args;
  const directTargetDirectoryPath = resolveTargetDirectoryPathOption(options);

  if (typeof directTargetDirectoryPath === "string") {
    return await Promise.resolve(directTargetDirectoryPath);
  }

  const projectRoot = resolveProjectRootPath({ options, tree });

  if (typeof projectRoot === "string") {
    return await Promise.resolve(projectRoot);
  }

  return await Promise.resolve(path.join("generated", definition.name));
}

/**
 * Normalizes runtime options into string inputs.
 */
function normalizeGeneratorInputs(
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
 * Resolves the project root path from Nx metadata.
 */
function resolveProjectRootPath(args: {
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
 * Resolves the target directory path from explicit options.
 */
function resolveTargetDirectoryPathOption(
  options: Record<string, unknown>,
): string | undefined {
  const directTargetDirectoryPath = options["targetDirectoryPath"];
  const directOutputDirectoryPath = options["outputDirectoryPath"];
  const directOutputPath = options["outputPath"];

  if (typeof directTargetDirectoryPath === "string") {
    return directTargetDirectoryPath;
  }

  if (typeof directOutputDirectoryPath === "string") {
    return directOutputDirectoryPath;
  }

  if (typeof directOutputPath === "string") {
    return directOutputPath;
  }

  return undefined;
}
