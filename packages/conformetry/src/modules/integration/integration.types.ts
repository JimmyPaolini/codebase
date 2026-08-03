import type { RunValidationArguments } from "@jimmypaolini/conformetry-validation";
import type { INestApplicationContext, Type } from "@nestjs/common";

// 🏷️ Types

/**
 * Runtime token surface consumed by conformetry-nx generator delegation.
 */
export interface IntegrationModuleSurface {
  IntegrationModule: Type<unknown>;
  IntegrationService: Parameters<INestApplicationContext["get"]>[0];
}

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
