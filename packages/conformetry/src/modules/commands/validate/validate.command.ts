import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import {
  ValidationPluginsService,
  ValidationService,
} from "@jimmypaolini/conformetry-validation";
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
    @Inject(ConfigurationService)
    private readonly configurationService: ConfigurationService,
    @Inject(ValidationService)
    private readonly validationService: ValidationService,
    @Inject(ValidationPluginsService)
    private readonly validationPluginsService: ValidationPluginsService,
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
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((projectName) => projectName.trim())
      .filter((projectName) => projectName.length > 0);
  }

  /**
   * Parses the optional rule filter option for the validate command.
   */
  @Option({
    description: "Comma-separated validator rule names to run",
    flags: "--rules [rules]",
  })
  parseRules(value: string | undefined): string[] | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value
      .split(",")
      .map((ruleName) => ruleName.trim())
      .filter((ruleName) => ruleName.length > 0);
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

    const conformetryConfiguration =
      await this.configurationService.loadConformetryConfiguration(
        configurationPath,
      );
    const plugins = this.validationPluginsService.buildValidatorPlugins();
    const pluginNames = new Set(
      plugins.map((plugin) => plugin.descriptor.name),
    );
    const pluginScopedRules =
      options.rules?.filter((ruleName) => pluginNames.has(ruleName)) ?? [];
    const filteredPlugins =
      pluginScopedRules.length > 0
        ? plugins.filter((plugin) =>
            pluginScopedRules.includes(plugin.descriptor.name),
          )
        : plugins;
    const requestedProjectPaths = options.projects ?? [];
    const projectPaths =
      requestedProjectPaths.length > 0
        ? requestedProjectPaths
        : [process.cwd()];
    const configuredTemplateRuleNames = Object.keys(
      conformetryConfiguration.generators,
    );
    const requestedRuleNames = options.rules ?? [];
    const templateRuleNames =
      requestedRuleNames.length > 0
        ? requestedRuleNames.filter((ruleName) =>
            configuredTemplateRuleNames.includes(ruleName),
          )
        : configuredTemplateRuleNames;

    const validationResult = await this.runConfiguredValidation({
      configurationPath,
      plugins: filteredPlugins,
      projectPaths,
      templateRuleNames,
      workingDirectory: process.cwd(),
    });

    this.logger.log(JSON.stringify(validationResult, null, 2));

    if (!validationResult.ok) {
      process.exitCode = 1;
      throw new Error("Validation failed");
    }
  }

  /**
   * Runs configured validation and returns the validation result.
   */
  public async runConfiguredValidation(args: {
    configurationPath: string;
    plugins: Parameters<ValidationService["runValidation"]>[0]["plugins"];
    projectPaths: string[];
    templateRuleNames: string[];
    workingDirectory: string;
  }): Promise<Awaited<ReturnType<ValidationService["runValidation"]>>> {
    return await this.validationService.runValidation({
      configurationPath: args.configurationPath,
      plugins: args.plugins,
      projectPaths: args.projectPaths,
      templateRuleNames: args.templateRuleNames,
      workingDirectory: args.workingDirectory,
    });
  }
}
