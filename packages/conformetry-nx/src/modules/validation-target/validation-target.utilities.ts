import { ValidationTargetService } from "./validation-target.service";

const validationTargetService = new ValidationTargetService();

/**
 * Builds an inferred conformetry validation target for tagged projects.
 */
export function buildInferredValidationTarget(args: {
  pluginOptions?: Record<string, unknown>;
  projectRoot: string;
  projectTags: string[];
}): Record<string, unknown> | undefined {
  return validationTargetService.buildInferredValidationTarget(
    args as {
      pluginOptions?: {
        validationTargetName?: string;
      };
      projectRoot: string;
      projectTags: string[];
    },
  );
}
