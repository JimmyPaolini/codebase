// ♟️ Constants

import type { LanguageValidatorDescriptor } from "@conformetry/core";

/** Extensions the text validator claims. */
export const TEXT_VALIDATOR_FILE_EXTENSIONS = [".txt"];

/** Identifies the text validator to the orchestrator and `--rules` filter. */
export const TEXT_VALIDATOR_DESCRIPTOR: LanguageValidatorDescriptor = {
  description: "Checks text files using duplicate-aware line conformance",
  fileExtensions: TEXT_VALIDATOR_FILE_EXTENSIONS,
  name: "text",
};
