import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

// ♟️ Constants
export const TEXT_VALIDATOR_FILE_EXTENSIONS = [".txt"];

export const TEXT_VALIDATOR_PLUGIN_DESCRIPTOR: ConformetryValidatorPlugin["descriptor"] =
  {
    description: "Checks text files using duplicate-aware line conformance",
    fileExtensions: [...TEXT_VALIDATOR_FILE_EXTENSIONS],
    name: "text",
  };
