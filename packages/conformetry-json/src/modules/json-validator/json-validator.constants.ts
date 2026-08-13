// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@jimmypaolini/conformetry-core";

/** Extensions the JSON validator claims. */
export const JSON_VALIDATOR_FILE_EXTENSIONS = [".json", ".jsonc"];

/** Identifies the JSON validator to the orchestrator and `--rules` filter. */
export const JSON_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks JSON and JSONC structural conformance",
  fileExtensions: JSON_VALIDATOR_FILE_EXTENSIONS,
  name: "json",
};
