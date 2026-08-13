import { NxGeneratorFactoryService } from "./nx-generator-factory.service";

import type {
  ConformetryGeneratorFactory,
  ConformetryGeneratorFactoryOptions,
  ResolveConformetryTargetDirectoryPathArguments,
} from "./nx-adapter.types";

/**
 * Creates a conformetry generator factory for Nx trees.
 */
export function createConformetryGeneratorFactory(
  args: ConformetryGeneratorFactoryOptions,
): ConformetryGeneratorFactory {
  return new NxGeneratorFactoryService().createConformetryGeneratorFactory(
    args,
  );
}

/**
 * Normalizes runtime options into string inputs.
 */
export function normalizeGeneratorInputs(
  options: Record<string, unknown>,
): Record<string, string | undefined> {
  return new NxGeneratorFactoryService().normalizeGeneratorInputs(options);
}

/**
 * Resolves the target directory for generated files.
 */
export async function resolveConformetryTargetDirectoryPath(
  args: ResolveConformetryTargetDirectoryPathArguments,
): Promise<string> {
  return await new NxGeneratorFactoryService().resolveConformetryTargetDirectoryPath(
    args,
  );
}
