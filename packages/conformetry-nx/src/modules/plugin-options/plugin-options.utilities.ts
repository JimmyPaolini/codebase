import { resolveConfigurationPath } from "@jimmypaolini/conformetry-configuration";

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
 * Resolves effective configuration path for Nx wrappers.
 */
export async function resolveConformetryConfigurationPath(args: {
  options: Record<string, unknown>;
  pluginOptions?: ConformetryNxPluginRegistrationOptions;
}): Promise<string> {
  return resolveConfigurationPath({
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
export function resolveConformetryNxPluginOptions(
  options?: unknown,
): ConformetryNxPluginRegistrationOptions {
  if (!isUnknownRecord(options)) {
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
  const templateRuleNamesByProjectTag = resolveTemplateRuleNamesByProjectTag(
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
export function resolveConformetryNxPluginOptionsFromNxJson(args: {
  nxJsonConfiguration: {
    plugins?: unknown;
  };
}): ConformetryNxPluginRegistrationOptions {
  const plugins = args.nxJsonConfiguration.plugins;
  if (!isUnknownArray(plugins)) {
    return resolveConformetryNxPluginOptions();
  }

  for (const pluginDefinition of plugins) {
    if (!isUnknownRecord(pluginDefinition)) {
      continue;
    }

    const pluginRecord = pluginDefinition;
    if (pluginRecord["plugin"] !== CONFORMETRY_NX_PLUGIN_NAME) {
      continue;
    }

    return resolveConformetryNxPluginOptions(pluginRecord["options"]);
  }

  return resolveConformetryNxPluginOptions();
}

/**
 * Returns true when the provided value is an array of unknown values.
 */
function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Returns true when the provided value is an object-like record.
 */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Parses the optional tag-to-rule mapping from plugin options.
 */
function resolveTemplateRuleNamesByProjectTag(
  value: unknown,
): TemplateRuleNamesByProjectTag | undefined {
  if (!isUnknownRecord(value)) {
    return undefined;
  }

  const recordValue = value;
  const mapping: Record<string, readonly string[]> = {};

  for (const [projectTag, mappedRuleNames] of Object.entries(recordValue)) {
    if (!isUnknownArray(mappedRuleNames)) {
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
