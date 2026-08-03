import type { RunValidationArguments } from "@jimmypaolini/conformetry-validation";

// 🏷️ Types

/**
 * Arguments for running a configured generator through conformetry integration.
 */
export interface RunConfiguredGeneratorArguments {
  configurationPath: string;
  generatorInputs: Record<string, string | undefined>;
  generatorName: string;
  targetDirectoryPath: string;
}

/**
 * Result returned by configured generator execution.
 */
export interface RunConfiguredGeneratorResult {
  generatedFilePaths: string[];
  outputDirectoryPath: string;
}

/**
 * Arguments for running configured validation through conformetry integration.
 */
export type RunConfiguredValidationArguments = RunValidationArguments;
