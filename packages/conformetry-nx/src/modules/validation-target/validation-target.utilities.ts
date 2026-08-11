import { ValidationTargetService } from "./validation-target.service.js";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types.js";
import type { TargetConfiguration } from "@nx/devkit";

/**
 * Builds an inferred conformetry validation target for tagged projects.
 */
export function buildInferredValidationTarget(args: {
  pluginOptions?: ConformetryNxPluginRegistrationOptions;
  projectRoot: string;
  projectTags: string[];
}): Record<string, TargetConfiguration> | undefined {
  return new ValidationTargetService().buildInferredValidationTarget(args);
}
