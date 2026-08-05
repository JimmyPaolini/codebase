import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

// ♟️ Constants
export const PYTHON_VALIDATOR_FILE_EXTENSIONS = [".ipynb", ".py"];

export const PYTHON_VALIDATOR_PLUGIN_DESCRIPTOR: ConformetryValidatorPlugin["descriptor"] =
  {
    description: "Checks Python and notebook conformance against templates",
    fileExtensions: [...PYTHON_VALIDATOR_FILE_EXTENSIONS],
    name: "python",
  };
