import {
  ConfigurationService,
  InputService,
} from "@jimmypaolini/conformetry-configuration";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

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
    private readonly inputService: InputService,
    private readonly configurationService: ConfigurationService,
    private readonly validationService: ValidationService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ValidateCommand.name);
  }

  /**
   * Resolves CLI inputs and prompts for missing values in interactive sessions.
   */
  private async resolveValidateInputs(args: {
    options: ValidateCommandOptions;
  }): Promise<{
    configurationPath: string;
    requestedProjectPaths?: string[];
    requestedRuleNames?: string[];
  }> {
    const promptWhenMissing =
      process.stdin.isTTY && process.env["CI"] !== "true";
    const resolvedInputs = await this.inputService.resolveInputsFromValues({
      promptWhenMissing,
      providedInputs: {
        config: args.options.config,
        projects: args.options.projects?.join(","),
        rules: args.options.rules?.join(","),
      },
      schema: {
        properties: {
          config: {
            description:
              "Path to conformetry config (leave blank to use configuration/conformetry.config.ts)",
            type: "string",
          },
          projects: {
            description:
              "Comma-separated project paths or names to validate (leave blank for all projects)",
            type: "string",
          },
          rules: {
            description:
              "Comma-separated validator rule names (leave blank for all rules)",
            type: "string",
          },
        },
      },
    });

    const defaultConfigurationPath = "configuration/conformetry.config.ts";
    const configurationPath =
      resolvedInputs["config"] ?? defaultConfigurationPath;
    const requestedProjectPaths = this.inputService.parseProjectFilterOption(
      resolvedInputs["projects"],
    );
    const requestedRuleNames = this.inputService.parseRuleFilterOption(
      resolvedInputs["rules"],
    );

    return {
      configurationPath,
      ...(requestedProjectPaths === undefined ? {} : { requestedProjectPaths }),
      ...(requestedRuleNames === undefined ? {} : { requestedRuleNames }),
    };
  }

  /**
   * Parses the configuration path option for the validate command.
   */
  @Option({
    description: "Path to the conformetry configuration file",
    flags: "--config [path]",
  })
  parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseConfigurationPathOption(value);
  }

  /**
   * Parses the optional project filter option for the validate command.
   */
  @Option({
    description: "Comma-separated project paths or names to validate",
    flags: "--projects [projects]",
  })
  parseProjects(value: string | undefined): string[] | undefined {
    return this.inputService.parseProjectFilterOption(value);
  }

  /**
   * Parses the optional rule filter option for the validate command.
   */
  @Option({
    description: "Comma-separated validator rule names to run",
    flags: "--rules [rules]",
  })
  parseRules(value: string | undefined): string[] | undefined {
    return this.inputService.parseRuleFilterOption(value);
  }

  /**
   * Runs the selected validator plugins and reports the aggregated result.
   */
  async run(
    _passedParameters: string[],
    options: ValidateCommandOptions,
  ): Promise<void> {
    const resolvedInputs = await this.resolveValidateInputs({ options });
    const configurationPath = resolvedInputs.configurationPath;

    await this.configurationService.loadConformetryConfiguration(
      configurationPath,
    );

    const validationResult =
      await this.validationService.validateConfiguredSelection({
        configurationPath,
        ...(resolvedInputs.requestedProjectPaths === undefined
          ? {}
          : { requestedProjectPaths: resolvedInputs.requestedProjectPaths }),
        ...(resolvedInputs.requestedRuleNames === undefined
          ? {}
          : { requestedRuleNames: resolvedInputs.requestedRuleNames }),
        workingDirectory: process.cwd(),
      });

    this.logger.log(JSON.stringify(validationResult, null, 2));

    if (!validationResult.ok) {
      process.exitCode = 1;
      throw new Error("Validation failed");
    }
  }
}
