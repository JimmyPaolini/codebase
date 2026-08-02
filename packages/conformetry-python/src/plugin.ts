import { PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR } from "./modules/python-validator/python-validator.constants.js";
import { PythonValidatorService } from "./modules/python-validator/python-validator.service.js";

import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

/**
 * Creates a validator plugin for Python files.
 */
export function createPythonValidatorPlugin(): ConformetryValidatorPlugin {
  const pythonValidatorService = new PythonValidatorService();

  return {
    descriptor: PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR,
    validate: async (arguments_) => {
      return pythonValidatorService.validate(arguments_);
    },
  };
}

export { PythonValidatorModule } from "./modules/python-validator/python-validator.module.js";
