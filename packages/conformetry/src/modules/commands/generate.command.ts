import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import {
  DefaultTemplateRenderer,
  GenerationRuntimeService,
  NodeFileSystemAdapter,
  NoopFormatterAdapter,
} from "@jimmypaolini/conformetry-generation";
import { ConsoleLogger, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import type { GenerateCommandOptions } from "./command.types.js";

/**
 * Executes a conformetry generator from a configuration file.
 */
@Command({
  description: "Generate files using a conformetry generator definition",
  name: "generate",
})
@Injectable()
export class GenerateCommand extends CommandRunner {
  constructor() {
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
    flags: "--targetDirectoryPath [path]",
  })
  parseTargetDirectoryPath(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Runs the requested generator and reports the generated output paths.
   */
  async run(
    _passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    if (options.config === undefined || options.name === undefined) {
      throw new Error("Both --config and --name are required");
    }

    const configurationService = new ConfigurationService();
    const configuration =
      await configurationService.loadConformetryConfiguration(options.config);
    const generatorDefinition = configuration.generators[options.name];

    if (generatorDefinition === undefined) {
      throw new Error(`Unknown generator "${options.name}"`);
    }

    const targetDirectoryPath =
      options.targetDirectoryPath ?? `generated/${generatorDefinition.name}`;

    const runtime = new GenerationRuntimeService();
    const result = await runtime.runGenerator({
      definition: {
        ...(generatorDefinition.aliases === undefined
          ? {}
          : { aliases: generatorDefinition.aliases }),
        ...(generatorDefinition.description === undefined
          ? {}
          : { description: generatorDefinition.description }),
        name: generatorDefinition.name,
        schemaPath: generatorDefinition.schemaPath,
        targetPathStrategy: generatorDefinition.targetPathStrategy,
        templateDirectoryPath: generatorDefinition.templateDirectoryPath,
      },
      filesystem: new NodeFileSystemAdapter(),
      formatter: new NoopFormatterAdapter(),
      inputs: {
        name: generatorDefinition.name,
        targetDirectoryPath,
      },
      targetDirectoryPath,
      templateRenderer: new DefaultTemplateRenderer(),
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
