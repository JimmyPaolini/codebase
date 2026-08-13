import { PluginOptionsService } from "./plugin-options.service";

/**
 * Parses raw Nx plugin options into a validated plugin options shape.
 */
export function resolveConformetryNxPluginOptions(options?: unknown): {
  configFilePath?: string;
  templateRuleNamesByProjectTag?: Record<string, readonly string[]>;
  validationTargetName?: string;
} {
  return new PluginOptionsService().resolveConformetryNxPluginOptions(options);
}
