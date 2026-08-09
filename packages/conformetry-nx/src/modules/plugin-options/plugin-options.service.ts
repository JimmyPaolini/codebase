import {
  CONFORMETRY_NX_PLUGIN_NAME,
  DEFAULT_CONFORMETRY_CONFIGURATION_PATH,
  DEFAULT_VALIDATION_TARGET_NAME,
} from "./plugin-options.constants";

import type {
  ConformetryNxPluginRegistrationOptions,
  TemplateRuleNamesByProjectTag,
} from "./plugin-options.types";

/**
 * Resolves effective plugin options for Nx wrappers.
 */
export class PluginOptionsService {
  /**
   * Resolves effective configuration path for Nx wrappers.
   */
  public async resolveConformetryConfigurationPath(args: {
    options: Record<string, unknown>;
    pluginOptions?: ConformetryNxPluginRegistrationOptions;
  }): Promise<string> {
    return this.resolveConfigurationPath({
      defaultConfigurationPath: DEFAULT_CONFORMETRY_CONFIGURATION_PATH,
      options: args.options,
      ...(args.pluginOptions === undefined
        ? {}
        : { pluginOptions: args.pluginOptions }),
    });
  }

  /**
   * Parses raw Nx plugin options into a validated plugin options shape.
   */
  public resolveConformetryNxPluginOptions(
    options?: unknown,
  ): ConformetryNxPluginRegistrationOptions {
    if (!this.isUnknownRecord(options)) {
      return {
        validationTargetName: DEFAULT_VALIDATION_TARGET_NAME,
      };
    }

    const optionsRecord = options;
    const configFilePath =
      typeof optionsRecord["configFilePath"] === "string"
        ? optionsRecord["configFilePath"]
        : undefined;
    const validationTargetName =
      typeof optionsRecord["validationTargetName"] === "string"
        ? optionsRecord["validationTargetName"]
        : DEFAULT_VALIDATION_TARGET_NAME;
    const templateRuleNamesByProjectTag =
      this.resolveTemplateRuleNamesByProjectTag(
        optionsRecord["templateRuleNamesByProjectTag"],
      );

    return {
      ...(configFilePath === undefined ? {} : { configFilePath }),
      ...(templateRuleNamesByProjectTag === undefined
        ? {}
        : { templateRuleNamesByProjectTag }),
      validationTargetName,
    };
  }

  /**
   * Reads this plugin's options from nx.json.
   */
  public resolveConformetryNxPluginOptionsFromNxJson(args: {
    nxJsonConfiguration: {
      plugins?: unknown;
    };
  }): ConformetryNxPluginRegistrationOptions {
    const plugins = args.nxJsonConfiguration.plugins;
    if (!this.isUnknownArray(plugins)) {
      return this.resolveConformetryNxPluginOptions();
    }

    for (const pluginDefinition of plugins) {
      if (!this.isUnknownRecord(pluginDefinition)) {
        continue;
      }

      const pluginRecord = pluginDefinition;
      if (pluginRecord["plugin"] !== CONFORMETRY_NX_PLUGIN_NAME) {
        continue;
      }

      return this.resolveConformetryNxPluginOptions(pluginRecord["options"]);
    }

    return this.resolveConformetryNxPluginOptions();
  }

  private resolveConfigurationPath(args: {
    defaultConfigurationPath: string;
    options: Record<string, unknown>;
    pluginOptions?: ConformetryNxPluginRegistrationOptions;
  }): string {
    return this.resolveConfigurationPathFromOptions(args);
  }

  private resolveConfigurationPathFromOptions(args: {
    defaultConfigurationPath: string;
    options: Record<string, unknown>;
    pluginOptions?: ConformetryNxPluginRegistrationOptions;
  }): string {
    const configFilePath = args.options["configFilePath"];
    if (typeof configFilePath === "string") {
      return configFilePath;
    }

    if (args.pluginOptions?.configFilePath !== undefined) {
      return args.pluginOptions.configFilePath;
    }

    return args.defaultConfigurationPath;
  }

  private isUnknownArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  private isUnknownRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  private resolveTemplateRuleNamesByProjectTag(
    value: unknown,
  ): TemplateRuleNamesByProjectTag | undefined {
    if (!this.isUnknownRecord(value)) {
      return undefined;
    }

    const recordValue = value;
    const mapping: Record<string, readonly string[]> = {};

    for (const [projectTag, mappedRuleNames] of Object.entries(recordValue)) {
      if (!this.isUnknownArray(mappedRuleNames)) {
        continue;
      }

      const normalizedRuleNames: string[] = [];

      for (const mappedRuleName of mappedRuleNames) {
        if (typeof mappedRuleName === "string") {
          normalizedRuleNames.push(mappedRuleName);
        }
      }

      if (normalizedRuleNames.length === 0) {
        continue;
      }

      mapping[projectTag] = normalizedRuleNames;
    }

    return Object.keys(mapping).length > 0 ? mapping : undefined;
  }
}
