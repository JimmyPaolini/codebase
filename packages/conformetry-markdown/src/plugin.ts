import { MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR } from "./modules/markdown-validator/markdown-validator.constants.js";
import { MarkdownValidatorService } from "./modules/markdown-validator/markdown-validator.service.js";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for Markdown files.
 */
export function createMarkdownValidatorPlugin(): ConformetryValidatorPlugin {
  const markdownValidatorService = new MarkdownValidatorService();

  return {
    descriptor: MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR,
    validate: async (arguments_) => {
      return markdownValidatorService.validate(arguments_);
    },
  };
}

export { MarkdownValidatorModule } from "./modules/markdown-validator/markdown-validator.module.js";
