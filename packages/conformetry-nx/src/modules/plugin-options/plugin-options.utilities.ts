import { PluginOptionsService } from "./plugin-options.service.js";

const pluginOptionsService = new PluginOptionsService();

/**
 * Resolves effective configuration path for Nx wrappers.
 */
export async function resolveConformetryConfigurationPath(args: {
  options: Record<string, unknown>;
  pluginOptions?: Record<string, unknown>;
}): Promise<string> {
  return await pluginOptionsService.resolveConformetryConfigurationPath(args as {
    options: Record<string, unknown>;
    pluginOptions?: {
      configFilePath?: string;
      validationTargetName?: string;
    };
  });
}

/**
 * Parses raw Nx plugin options into a validated plugin options shape.
 */
export function resolveConformetryNxPluginOptions(
  options?: unknown,
): {
  configFilePath?: string;
  templateRuleNamesByProjectTag?: Record<string, readonly string[]>;
  validationTargetName?: string;
} {
  return pluginOptionsService.resolveConformetryNxPluginOptions(options);
}

/**
 * Reads this plugin's options from nx.json.
 */
export function resolveConformetryNxPluginOptionsFromNxJson(args: {
  nxJsonConfiguration: {
    plugins?: unknown;
  };
}): {
  configFilePath?: string;
  templateRuleNamesByProjectTag?: Record<string, readonly string[]>;
  validationTargetName?: string;
} {
  return pluginOptionsService.resolveConformetryNxPluginOptionsFromNxJson(args);
}
