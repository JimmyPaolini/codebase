import { Injectable } from "@nestjs/common";

import { NxGeneratorFactoryService } from "./nx-generator-factory.service.js";

import type {
  ConformetryGeneratorFactory,
  ConformetryGeneratorFactoryOptions,
  ResolveConformetryTargetDirectoryPathArguments,
} from "./nx-adapter.types.js";

/**
 * Orchestrates Nx adapter behavior through injectable NestJS services.
 */
@Injectable()
export class NxAdapterService {
  constructor(
    private readonly nxGeneratorFactoryService: NxGeneratorFactoryService,
  ) {}

  /**
   * Creates a conformetry generator factory for Nx trees.
   */
  public createConformetryGeneratorFactory(
    args: ConformetryGeneratorFactoryOptions,
  ): ConformetryGeneratorFactory {
    return this.nxGeneratorFactoryService.createConformetryGeneratorFactory(args);
  }

  /**
   * Normalizes Nx generator options into conformetry input values.
   */
  public normalizeGeneratorInputs(
    options: Record<string, unknown>,
  ): Record<string, string | undefined> {
    return this.nxGeneratorFactoryService.normalizeGeneratorInputs(options);
  }

  /**
   * Resolves the output directory used by conformetry generator factories.
   */
  public async resolveConformetryTargetDirectoryPath(
    args: ResolveConformetryTargetDirectoryPathArguments,
  ): Promise<string> {
    return await this.nxGeneratorFactoryService.resolveConformetryTargetDirectoryPath(
      args,
    );
  }
}
