import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { createJsonValidatorPlugin } from "@jimmypaolini/conformetry-json";
import { createMarkdownValidatorPlugin } from "@jimmypaolini/conformetry-markdown";
import { resolveTemplateRuleRouting } from "@jimmypaolini/conformetry-nx";
import { createPythonValidatorPlugin } from "@jimmypaolini/conformetry-python";
import { createTextValidatorPlugin } from "@jimmypaolini/conformetry-text";
import { createTypeScriptValidatorPlugin } from "@jimmypaolini/conformetry-typescript";
import { ValidationService } from "@jimmypaolini/conformetry-validation";
import { ConsoleLogger, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import type { ValidateCommandOptions } from "./command.types.js";

/**
 * Executes conformetry validation plugins against the selected project paths.
 */
@Command({
  description: "Validate project files using conformetry validator plugins",
  name: "validate",
})
@Injectable()
export class ValidateCommand extends CommandRunner {
  constructor() {
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

    const configurationService = new ConfigurationService();
    const conformetryConfiguration =
      await configurationService.loadConformetryConfiguration(
        configurationPath,
      );
    const plugins = [
      createTypeScriptValidatorPlugin(),
      createPythonValidatorPlugin(),
      createMarkdownValidatorPlugin(),
      createJsonValidatorPlugin(),
      createTextValidatorPlugin(),
    ];
    const pluginNames = new Set(
      plugins.map((plugin) => plugin.descriptor.name),
    );
    const pluginScopedRules =
      options.rules?.filter((ruleName) => pluginNames.has(ruleName)) ?? [];
    const requestedTemplateRuleNames =
      options.rules?.filter((ruleName) => !pluginNames.has(ruleName)) ?? [];
    const filteredPlugins =
      pluginScopedRules.length > 0
        ? plugins.filter((plugin) =>
            pluginScopedRules.includes(plugin.descriptor.name),
          )
        : plugins;
    const routedTemplateRules = resolveTemplateRuleRouting({
      configuredTemplateRuleNames: Object.keys(
        conformetryConfiguration.generators,
      ),
      projectSelectors: options.projects?.length
        ? options.projects
        : [process.cwd()],
      ...(requestedTemplateRuleNames.length > 0
        ? { requestedTemplateRuleNames }
        : {}),
      workingDirectory: process.cwd(),
    });

    const validationService = new ValidationService();
    const validationResult = await validationService.runValidation({
      configurationPath,
      plugins: filteredPlugins,
      projectPaths: routedTemplateRules.projectPaths,
      templateRuleNames: routedTemplateRules.templateRuleNames,
      workingDirectory: process.cwd(),
    });

    this.logger.log(JSON.stringify(validationResult, null, 2));

    if (!validationResult.ok) {
      process.exitCode = 1;
      throw new Error("Validation failed");
    }
  }
}
