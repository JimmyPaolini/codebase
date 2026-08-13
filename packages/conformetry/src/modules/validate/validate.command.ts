import { InputService } from "@jimmypaolini/conformetry-configuration";
import { ReportingService } from "@jimmypaolini/conformetry-core";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

import type { ValidateCommandOptions } from "./validate.types.js";

/**
 * Validates workspace projects against their conformetry templates.
 *
 * Every option is optional and none is ever prompted for: `--projects` and
 * `--rules` narrow a run that otherwise covers the whole workspace, so an
 * absent value is a meaningful default rather than a missing answer.
 */
@Command({
  description: "Run the validate command",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly inputService: InputService,
    private readonly reportingService: ReportingService,
    private readonly validationService: ValidationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ValidateCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parses the optional configuration path. */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the optional project filter. */
  @Option({
    description: "Comma-separated project paths or names to validate",
    flags: "--projects [projects]",
  })
  public parseProjects(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Parses the optional rule filter. */
  @Option({
    description: "Comma-separated language or generator names to run",
    flags: "--rules [rules]",
  })
  public parseRules(value: string | undefined): string[] | undefined {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Runs validation and reports every difference found. */
  public async run(
    _passedParameters: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    const workingDirectory = process.cwd();
    const result = await this.validationService.validate({
      ...(options.config === undefined
        ? {}
        : { configurationPath: options.config }),
      ...(options.projects === undefined
        ? {}
        : { projectPaths: options.projects }),
      ...(options.rules === undefined ? {} : { ruleNames: options.rules }),
      workingDirectory,
    });

    this.logger.log(
      this.reportingService.formatReport({
        fileResults: result.fileResults,
        workingDirectory,
      }),
    );

    if (!result.ok) {
      process.exitCode = 1;
      throw new Error(
        `Validation failed: ${String(result.fileResults.length)} file(s) do not conform.`,
      );
    }
  }
}
