import { ConfigurationService } from "@jimmypaolini/conformetry-configuration";
import { JsonValidatorService } from "@jimmypaolini/conformetry-json";
import { MarkdownValidatorService } from "@jimmypaolini/conformetry-markdown";
import { PythonValidatorService } from "@jimmypaolini/conformetry-python";
import { TextValidatorService } from "@jimmypaolini/conformetry-text";
import { TypeScriptValidatorService } from "@jimmypaolini/conformetry-typescript";
import { Injectable } from "@nestjs/common";

import { resolveValidationSelection } from "./validation-project-paths.utilities.js";

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
    private readonly typeScriptValidatorService: TypeScriptValidatorService,
    private readonly pythonValidatorService: PythonValidatorService,
    private readonly markdownValidatorService: MarkdownValidatorService,
    private readonly jsonValidatorService: JsonValidatorService,
    private readonly textValidatorService: TextValidatorService,
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
    const plugins = [
      {
        descriptor: this.typeScriptValidatorService.pluginDescriptor,
        validate: this.typeScriptValidatorService.validate.bind(
          this.typeScriptValidatorService,
        ),
      },
      {
        descriptor: this.pythonValidatorService.pluginDescriptor,
        validate: this.pythonValidatorService.validate.bind(
          this.pythonValidatorService,
        ),
      },
      {
        descriptor: this.markdownValidatorService.pluginDescriptor,
        validate: this.markdownValidatorService.validate.bind(
          this.markdownValidatorService,
        ),
      },
      {
        descriptor: this.jsonValidatorService.pluginDescriptor,
        validate: this.jsonValidatorService.validate.bind(
          this.jsonValidatorService,
        ),
      },
      {
        descriptor: this.textValidatorService.pluginDescriptor,
        validate: this.textValidatorService.validate.bind(
          this.textValidatorService,
        ),
      },
    ];
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
    const { projectPaths, templateRuleNames } = resolveValidationSelection({
      configuredTemplateRuleNames: Object.keys(
        conformetryConfiguration.generators,
      ),
      ...(args.requestedProjectPaths === undefined
        ? {}
        : { requestedProjectPaths: args.requestedProjectPaths }),
      ...(args.requestedRuleNames === undefined
        ? {}
        : { requestedRuleNames: args.requestedRuleNames }),
      workingDirectory: args.workingDirectory,
    });

    if (projectPaths.length === 0) {
      return {
        ok: false,
        pluginResults: [
          {
            checkedPaths: [],
            ok: false,
            pluginName: "workspace-discovery",
            violations: [
              `No project paths were found under ${args.workingDirectory}`,
            ],
          },
        ],
      };
    }
    return await this.validate({
      configurationPath: args.configurationPath,
      plugins: filteredPlugins,
      projectPaths,
      templateRuleNames,
      workingDirectory: args.workingDirectory,
    });
  }
}
