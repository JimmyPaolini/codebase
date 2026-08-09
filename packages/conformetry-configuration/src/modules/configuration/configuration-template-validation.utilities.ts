import { TemplateValidationService } from "./configuration-template-validation.service";
import { ConfigurationService } from "./configuration.service";

import type {
  PreparedValidationPayload,
  PrepareTemplateValidationPayloadArguments,
} from "./configuration.types";

/**
 * Prepares rendered template-instance documents for language validators.
 */
export async function prepareTemplateValidationPayload(
  args: PrepareTemplateValidationPayloadArguments,
): Promise<PreparedValidationPayload> {
  return getTemplateValidationService().prepareTemplateValidationPayload(args);
}

/**
 * Creates a template-validation service for payload preparation.
 */
function getTemplateValidationService(): TemplateValidationService {
  return new TemplateValidationService(new ConfigurationService());
}
