import {
  ConfigurationService,
  parseCommaDelimitedOption,
} from "@jimmypaolini/conformetry-configuration";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { ConsoleLogger, Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import type { ValidateCommandOptions } from "./validate.types.js";

/**
 * Executes conformetry validation plugins against the selected project paths.
 */
@Command({
  description: "Validate project files using conformetry validator plugins",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly validationService: ValidationService,
  ) {
    super();
    this.logger.setContext(ValidateCommand.name);
  }

  private readonly logger = new ConsoleLogger();

  /**
   * Parses the configuration path option for the validate command.
   */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Parses the optional project filter option for the validate command.
   */
  @Option({
    description: "Comma-separated project paths or names to validate",
    flags: "--projects [projects]",
  })
  parseProjects(value: string | undefined): string[] | undefined {
    return parseCommaDelimitedOption(value);
  }

  /**
   * Parses the optional rule filter option for the validate command.
   */
  @Option({
    description: "Comma-separated validator rule names to run",
    flags: "--rules [rules]",
  })
  parseRules(value: string | undefined): string[] | undefined {
    return parseCommaDelimitedOption(value);
  }

  /**
   * Runs the selected validator plugins and reports the aggregated result.
   */
  async run(
    _passedParameters: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    const configurationPath =
      options.config ?? "configuration/conformetry.config.ts";

    await this.configurationService.loadConformetryConfiguration(
      configurationPath,
    );

    const validationResult =
      await this.validationService.validateConfiguredSelection({
        configurationPath,
        ...(options.projects === undefined
          ? {}
          : { requestedProjectPaths: options.projects }),
        ...(options.rules === undefined
          ? {}
          : { requestedRuleNames: options.rules }),
        workingDirectory: process.cwd(),
      });

    this.logger.log(JSON.stringify(validationResult, null, 2));

    if (!validationResult.ok) {
      process.exitCode = 1;
      throw new Error("Validation failed");
    }
  }
}

// Manually apply Inject parameter decorators at runtime so the class remains
// injectable even when design:paramtypes metadata is absent (some test
// reproductions clear that metadata). This mirrors using `@Inject(...)` on
// the constructor parameters but avoids parameter-decorator syntax so build
// tooling that doesn't enable experimental decorators won't fail.
Inject(ConfigurationService)(ValidateCommand, undefined, 0);
Inject(ValidationService)(ValidateCommand, undefined, 1);
