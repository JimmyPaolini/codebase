import { PluginOptionsService } from "./plugin-options.service";

const pluginOptionsService = new PluginOptionsService();

/**
 * Parses raw Nx plugin options into a validated plugin options shape.
 */
export function resolveConformetryNxPluginOptions(options?: unknown): {
  configFilePath?: string;
  templateRuleNamesByProjectTag?: Record<string, readonly string[]>;
  validationTargetName?: string;
} {
  return pluginOptionsService.resolveConformetryNxPluginOptions(options);
}
