import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { Injectable } from "@nestjs/common";

import { ValidationLanguageService } from "./validation-language.service.js";

import type {
  RunValidationArguments,
  RunValidationResult,
  ValidationPluginArguments,
  ValidationPluginResult,
} from "@jimmypaolini/conformetry-configuration";

/**
 * Orchestrates validator plugin execution over selected project paths.
 */
@Injectable()
export class ValidationService {
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly validationLanguageService: ValidationLanguageService,
  ) {}

  /**
   * Runs a set of validator plugins against the requested project paths.
   */
  public async validate(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const projectPaths = args.projectPaths?.length
      ? args.projectPaths
      : [args.workingDirectory];

    const pluginResults: ValidationPluginResult[] = [];

    for (const plugin of args.plugins) {
      const pluginArguments: ValidationPluginArguments = {
        filePaths: projectPaths,
        ...(args.configurationPath === undefined
          ? {}
          : { configurationPath: args.configurationPath }),
        ...(args.templateRuleNames === undefined
          ? {}
          : { templateRuleNames: args.templateRuleNames }),
        workingDirectory: args.workingDirectory,
      };

      const pluginResult = await plugin.validate(pluginArguments);
      pluginResults.push(pluginResult);
    }

    return {
      ok: pluginResults.every((pluginResult) => pluginResult.ok),
      pluginResults,
    };
  }

  /**
   * Loads configuration, resolves requested rule/project filters, and executes validation.
   */
  public async validateConfiguredSelection(args: {
    configurationPath: string;
    requestedProjectPaths?: string[];
    requestedRuleNames?: string[];
    workingDirectory: string;
  }): Promise<RunValidationResult> {
    const conformetryConfiguration =
      await this.configurationService.loadConformetryConfiguration(
        args.configurationPath,
      );
    const plugins = this.validationLanguageService.buildValidatorPlugins();
    const pluginNames = new Set(
      plugins.map((plugin) => plugin.descriptor.name),
    );
    const requestedRuleNames = args.requestedRuleNames ?? [];
    const pluginScopedRules = requestedRuleNames.filter((ruleName) =>
      pluginNames.has(ruleName),
    );
    const filteredPlugins =
      pluginScopedRules.length > 0
        ? plugins.filter((plugin) =>
            pluginScopedRules.includes(plugin.descriptor.name),
          )
        : plugins;
    const requestedProjectPaths = args.requestedProjectPaths ?? [];
    const projectPaths =
      requestedProjectPaths.length > 0
        ? requestedProjectPaths
        : [args.workingDirectory];
    const configuredTemplateRuleNames = Object.keys(
      conformetryConfiguration.generators,
    );
    const templateRuleNames =
      requestedRuleNames.length > 0
        ? requestedRuleNames.filter((ruleName) =>
            configuredTemplateRuleNames.includes(ruleName),
          )
        : configuredTemplateRuleNames;

    return await this.validate({
      configurationPath: args.configurationPath,
      plugins: filteredPlugins,
      projectPaths,
      templateRuleNames,
      workingDirectory: args.workingDirectory,
    });
  }
}
