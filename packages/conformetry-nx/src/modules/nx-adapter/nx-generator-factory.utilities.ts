import { NxGeneratorFactoryService } from "./nx-generator-factory.service.js";

const nxGeneratorFactoryService = new NxGeneratorFactoryService();

/**
 * Creates a conformetry generator factory for Nx trees.
 */
export function createConformetryGeneratorFactory(args: {
  definition: {
    name: string;
  };
  resolveTargetDirectoryPath?: (args: {
    options: Record<string, unknown>;
    tree: unknown;
  }) => Promise<string> | string;
}): (tree: unknown, options?: Record<string, unknown>) => Promise<() => Promise<void>> {
  return nxGeneratorFactoryService.createConformetryGeneratorFactory(args as {
    definition: {
      name: string;
    };
    resolveTargetDirectoryPath?: (args: {
      options: Record<string, unknown>;
      tree: unknown;
    }) => Promise<string> | string;
  });
}

/**
 * Normalizes runtime options into string inputs.
 */
export function normalizeGeneratorInputs(
  options: Record<string, unknown>,
): Record<string, string | undefined> {
  return nxGeneratorFactoryService.normalizeGeneratorInputs(options);
}

/**
 * Resolves the target directory for generated files.
 */
export async function resolveConformetryTargetDirectoryPath(args: {
  definition: {
    name: string;
  };
  options: Record<string, unknown>;
  tree: unknown;
}): Promise<string> {
  return await nxGeneratorFactoryService.resolveConformetryTargetDirectoryPath(args as {
    definition: {
      name: string;
    };
    options: Record<string, unknown>;
    tree: unknown;
  });
}
