import { ConfigurationService, InputService } from "@conformetry/configuration";
import { GenerationService } from "@conformetry/generation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

import { DEFAULT_GENERATED_DIRECTORY } from "./generate.constants";

import type { GenerateCommandOptions } from "./generate.types";
import type { JsonSchemaDefinition } from "@conformetry/configuration";

/**
 * Runs a conformetry generator from the configured registry.
 *
 * Unknown options are allowed through deliberately: a generator's parameters
 * are not known until the generator is chosen, so they cannot be declared as
 * flags ahead of time. They are matched against the generator's own schema
 * instead. This is also why the generator is selected with `--generator`
 * rather than `--name` — nearly every generator takes a `name` parameter, and
 * reserving that flag made it impossible to supply.
 */
@Command({
  allowUnknownOptions: true,
  description: "Run the generate command",
  name: "generate",
})
@Injectable()
export class GenerateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly generationService: GenerationService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(GenerateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Whether missing values may be asked for interactively.
   *
   * `process.stdin.isTTY` is `undefined` rather than `false` when stdin is not
   * a terminal, so it is coerced explicitly — treating that `undefined` as
   * "unset, so prompt" is what used to hang the command in CI.
   */
  private canPrompt(options: GenerateCommandOptions): boolean {
    return (
      options.interactive !== false &&
      process.stdin.isTTY &&
      process.env["CI"] !== "true"
    );
  }

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the output directory override. */
  @Option({
    description: "Directory to write generated files into",
    flags: "--directory [path]",
  })
  public parseDirectory(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the name of the generator to run. */
  @Option({
    description: "Name of the generator to run",
    flags: "--generator <generator>",
    required: true,
  })
  public parseGenerator(value: string): string {
    return this.inputService.parseRequiredOption({
      optionName: "generator",
      value,
    });
  }

  /** Parses the opt-out from interactive prompting. */
  @Option({
    description: "Never prompt for missing values",
    flags: "--no-interactive",
  })
  public parseInteractive(): boolean {
    return false;
  }

  /** Resolves the generator's inputs and writes its files. */
  public async run(
    passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? "configuration/conformetry.config.ts",
      );
    const definition = configuration.find((generator) => {
      return generator.name === options.generator;
    });

    if (definition === undefined) {
      throw new Error(
        `Unknown generator "${options.generator}". Available: ${configuration.map((generator) => generator.name).join(", ")}`,
      );
    }

    const schema: JsonSchemaDefinition = { properties: definition.inputs };
    const inputs = await this.inputService.resolveGeneratorInputs({
      promptWhenMissing: this.canPrompt(options),
      rawArguments: [...passedParameters, ...process.argv.slice(2)],
      schema,
    });
    const result = await this.generationService.runGenerator({
      definition: {
        name: definition.name,
        templateDirectoryPath: definition.templatePath,
      },
      inputs,
      instancePath:
        options.directory ??
        `${DEFAULT_GENERATED_DIRECTORY}/${definition.name}`,
    });

    this.logger.log(
      [
        `Generated ${String(result.generatedFilePaths.length)} file(s) in ${result.outputDirectoryPath}:`,
        ...result.generatedFilePaths.map((filePath) => `  ${filePath}`),
      ].join("\n"),
    );
  }
}
