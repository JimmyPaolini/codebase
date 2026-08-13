import { ValidationTargetService } from "./validation-target.service";

import type { ConformetryNxPluginRegistrationOptions } from "../plugin-options/plugin-options.types";
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
