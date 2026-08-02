import { TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR } from "./modules/typescript-validator/typescript-validator.constants.js";
import { TypeScriptValidatorService } from "./modules/typescript-validator/typescript-validator.service.js";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for TypeScript files.
 */
export function createTypeScriptValidatorPlugin(): ConformetryValidatorPlugin {
  const typeScriptValidatorService = new TypeScriptValidatorService();

  return {
    descriptor: TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR,
    validate: async (arguments_) => {
      return typeScriptValidatorService.validate(arguments_);
    },
  };
}

export { TypeScriptValidatorModule } from "./modules/typescript-validator/typescript-validator.module.js";
