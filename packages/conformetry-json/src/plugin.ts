import { JSON_VALIDATOR_PLUGIN_DESCRIPTOR } from "./modules/json-validator/json-validator.constants.js";
import { JsonValidatorService } from "./modules/json-validator/json-validator.service.js";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for JSON files.
 */
export function createJsonValidatorPlugin(): ConformetryValidatorPlugin {
  const jsonValidatorService = new JsonValidatorService();

  return {
    descriptor: JSON_VALIDATOR_PLUGIN_DESCRIPTOR,
    validate: async (arguments_) => {
      return jsonValidatorService.validate(arguments_);
    },
  };
}

export { JsonValidatorModule } from "./modules/json-validator/json-validator.module.js";
