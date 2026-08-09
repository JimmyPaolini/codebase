import {
  collectGeneratorInputsFromCommandArguments,
  ConfigurationService,
} from "@jimmypaolini/conformetry-configuration";
import { GenerationService } from "@jimmypaolini/conformetry-generation";
import { ConsoleLogger, Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import type { GenerateCommandOptions } from "./generate.types";
import type { JsonSchemaDefinition } from "@jimmypaolini/conformetry-configuration";

/**
 * Executes a conformetry generator from a configuration file.
 */
@Command({
  description: "Generate files using a conformetry generator definition",
  name: "generate",
})
@Injectable()
export class GenerateCommand extends CommandRunner {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly generationService: GenerationService,
  ) {
    super();
    this.logger.setContext(GenerateCommand.name);
  }

  private readonly logger = new ConsoleLogger();

  /**
   * Parses the configuration path option for the generate command.
   */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
    required: true,
  })
  parseConfig(value: string): string {
    return value;
  }

  /**
   * Parses the generator name option for the generate command.
   */
  @Option({
    description: "Generator name to execute",
    flags: "--name [name]",
    required: true,
  })
  parseName(value: string): string {
    return value;
  }

  /**
   * Parses the target directory override option for the generate command.
   */
  @Option({
    description: "Override the output directory for generated files",
    flags: "--directory [path]",
  })
  parseTargetDirectoryPath(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Runs the requested generator and reports the generated output paths.
   */
  async run(
    passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    if (options.config === undefined || options.name === undefined) {
      throw new Error("Both --config and --name are required");
    }

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config,
      );
    const generatorDefinition = configuration.generators[options.name];

    if (generatorDefinition === undefined) {
      throw new Error(`Unknown generator "${options.name}"`);
    }

    const schema: JsonSchemaDefinition = {
      properties: generatorDefinition.parameters,
    };
    const generatorInputs = collectGeneratorInputsFromCommandArguments({
      rawArguments: passedParameters,
      schema,
    });

    await this.runConfiguredGeneration({
      configurationPath: options.config,
      generatorInputs,
      generatorName: options.name,
      targetDirectoryPath:
        options.targetDirectoryPath ?? `generated/${generatorDefinition.name}`,
    });
  }

  /**
   * Runs a configured generator and reports the generated output paths.
   */
  public async runConfiguredGeneration(args: {
    configurationPath: string;
    generatorInputs: Record<string, string | undefined>;
    generatorName: string;
    targetDirectoryPath: string;
  }): Promise<void> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const generatorDefinition = configuration.generators[args.generatorName];

    if (generatorDefinition === undefined) {
      throw new Error(`Unknown generator "${args.generatorName}"`);
    }

    const result = await this.generationService.runGenerator({
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

    this.logger.log(
      JSON.stringify(
        {
          generatedFilePaths: result.generatedFilePaths,
          outputDirectoryPath: result.outputDirectoryPath,
        },
        null,
        2,
      ),
    );
  }
}
