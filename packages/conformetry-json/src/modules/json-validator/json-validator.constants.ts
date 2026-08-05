import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

// ♟️ Constants
export const JSON_VALIDATOR_FILE_EXTENSIONS = [".json", ".jsonc"];

export const JSON_VALIDATOR_PLUGIN_DESCRIPTOR: ConformetryValidatorPlugin["descriptor"] =
  {
    description: "Checks JSON and JSONC structural conformance",
    fileExtensions: [...JSON_VALIDATOR_FILE_EXTENSIONS],
    name: "json",
  };
