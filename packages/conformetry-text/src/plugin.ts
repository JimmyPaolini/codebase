import { TEXT_VALIDATOR_PLUGIN_DESCRIPTOR } from "./modules/text-validator/text-validator.constants.js";
import { TextValidatorService } from "./modules/text-validator/text-validator.service.js";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for text files.
 */
export function createTextValidatorPlugin(): ConformetryValidatorPlugin {
  const textValidatorService = new TextValidatorService();

  return {
    descriptor: TEXT_VALIDATOR_PLUGIN_DESCRIPTOR,
    validate: async (arguments_) => {
      return textValidatorService.validate(arguments_);
    },
  };
}

export { TextValidatorModule } from "./modules/text-validator/text-validator.module.js";
