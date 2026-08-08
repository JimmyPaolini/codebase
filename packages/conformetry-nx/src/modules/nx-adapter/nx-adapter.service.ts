import { Injectable } from "@nestjs/common";

import {
  createConformetryGeneratorFactory,
  normalizeGeneratorInputs,
  resolveConformetryTargetDirectoryPath,
} from "./nx-generator-factory.utilities";

import type {
  ConformetryGeneratorFactory,
  ConformetryGeneratorFactoryOptions,
  ResolveConformetryTargetDirectoryPathArguments,
} from "./nx-adapter.types";

/**
 * Orchestrates Nx adapter behavior through injectable NestJS services.
 */
@Injectable()
export class NxAdapterService {
  /**
   * Creates a conformetry generator factory for Nx trees.
   */
  public createConformetryGeneratorFactory(
    args: ConformetryGeneratorFactoryOptions,
  ): ConformetryGeneratorFactory {
    return createConformetryGeneratorFactory(args);
  }

  /**
   * Normalizes Nx generator options into conformetry input values.
   */
  public normalizeGeneratorInputs(
    options: Record<string, unknown>,
  ): Record<string, string | undefined> {
    return normalizeGeneratorInputs(options);
  }

  /**
   * Resolves the output directory used by conformetry generator factories.
   */
  public async resolveConformetryTargetDirectoryPath(
    args: ResolveConformetryTargetDirectoryPathArguments,
  ): Promise<string> {
    return await resolveConformetryTargetDirectoryPath(args);
  }
}
