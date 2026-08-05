import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { GenerationRuntimeService } from "@jimmypaolini/conformetry-generation";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { Inject, Injectable } from "@nestjs/common";

import type {
  RunConfiguredGeneratorArguments,
  RunConfiguredGeneratorResult,
  RunConfiguredValidationArguments,
} from "./integration.types.js";
import type { RunValidationResult } from "@jimmypaolini/conformetry-validation";

/**
 * Provides a facade API for Nx to hand off generation and validation work.
 */
@Injectable()
export class IntegrationService {
  constructor(
    @Inject(ConfigurationService)
    private readonly configurationService: ConfigurationService,
    @Inject(GenerationRuntimeService)
    private readonly generationRuntimeService: GenerationRuntimeService,
    @Inject(ValidationService)
    private readonly validationService: ValidationService,
  ) {}

  /**
   * Runs a configured generator and returns generated paths.
   */
  public async runConfiguredGenerator(
    args: RunConfiguredGeneratorArguments,
  ): Promise<RunConfiguredGeneratorResult> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const generatorDefinition = configuration.generators[args.generatorName];

    if (generatorDefinition === undefined) {
      throw new Error(`Unknown generator "${args.generatorName}"`);
    }

    return this.generationRuntimeService.runGenerator({
      definition: {
        ...(generatorDefinition.aliases === undefined
          ? {}
          : { aliases: generatorDefinition.aliases }),
        ...(generatorDefinition.description === undefined
          ? {}
          : { description: generatorDefinition.description }),
        name: generatorDefinition.name,
        templateDirectoryPath: generatorDefinition.templateDirectoryPath,
      },
      inputs: {
        name: generatorDefinition.name,
        ...args.generatorInputs,
      },
      targetDirectoryPath: args.targetDirectoryPath,
    });
  }

  /**
   * Runs configured validation and returns the validation result.
   */
  public async runConfiguredValidation(
    args: RunConfiguredValidationArguments,
  ): Promise<RunValidationResult> {
    return this.validationService.runValidation(args);
  }
}
