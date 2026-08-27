import {
  ConfigurationService,
  InputError,
  InputService,
} from "@conformetry/configuration";
import { GenerationService } from "@conformetry/generation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DEFAULT_CONFIGURATION_PATH } from "../../constants.js";

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
  description: "Render a generator's template into a new instance",
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

  /** Resolves the generator's inputs and writes its files. */
  private async generate(
    passedParameters: readonly string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    this.logger.debug("🏗 Generating a conformetry instance", undefined, {
      generator: options.generator,
    });

    const configuration =
      await this.configurationService.loadConformetryConfiguration(
        options.config ?? DEFAULT_CONFIGURATION_PATH,
      );
    const definition = configuration.find((generator) => {
      return generator.name === options.generator;
    });

    if (definition === undefined) {
      this.logger.error("🚫 Rejected an unknown generator", undefined, {
        generator: options.generator,
      });
      throw new Error(
        `Unknown generator "${options.generator}". Available: ${configuration.map((generator) => generator.name).join(", ")}`,
      );
    }

    // Every input is required, which is what `conformetry-nx` has always told
    // Nx about the same generators: a conformetry generator substitutes each
    // of its placeholders, and mustache renders a missing one as empty rather
    // than failing, so an optional input would silently produce a hole. This
    // command used to pass `properties` alone, leaving every input optional
    // and every missing one skipped — the hole nobody was warned about.
    const schema: JsonSchemaDefinition = {
      properties: definition.inputs,
      required: Object.keys(definition.inputs),
    };
    const inputs = await this.inputService.resolveGeneratorInputs({
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

    // The file list is what the caller asked for, so it goes to stdout; the
    // log line carries the same facts as data a telemetry backend can group.
    process.stdout.write(
      `${result.generatedFilePaths.map((filePath) => `  ${filePath}`).join("\n")}\n`,
    );
    this.logger.info("✨ Generated instance files", undefined, {
      count: result.generatedFilePaths.length,
      outputDirectoryPath: result.outputDirectoryPath,
    });
  }

  /**
   * Logs a command line the input service refused, and fails the run.
   *
   * A required input that could not be asked for is the reader's own typing
   * to fix, so it is reported as a rejected command line rather than as a
   * crash. Nothing was generated, and the next move is to pass the flag it
   * named, not to read a stack trace.
   */
  private rejectCommandLine(error: InputError): void {
    this.logger.error("🚫 Rejected the command line", undefined, {
      reason: error.message,
    });
    process.exitCode = 1;
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

  /**
   * Runs the generator, reporting a refused command line as one.
   *
   * Only an `InputError` is caught: a required input nobody could be asked
   * for is a flag the caller has to pass, where anything else is a genuine
   * failure and keeps its stack.
   */
  public async run(
    passedParameters: string[],
    options: GenerateCommandOptions,
  ): Promise<void> {
    try {
      await this.generate(passedParameters, options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
