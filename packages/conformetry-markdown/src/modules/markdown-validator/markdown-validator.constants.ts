import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-validation";

// ♟️ Constants
export const MARKDOWN_VALIDATOR_FILE_EXTENSIONS = [".md"];

export const MARKDOWN_VALIDATOR_PLUGIN_DESCRIPTOR: ConformetryValidatorPlugin["descriptor"] =
  {
    description: "Checks markdown structural conformance using mdast",
    fileExtensions: [...MARKDOWN_VALIDATOR_FILE_EXTENSIONS],
    name: "markdown",
  };

export const CONTAINER_TYPES = new Set<string>([
  "blockquote",
  "document",
  "list",
  "listItem",
  "root",
  "table",
  "tableCell",
  "tableRow",
]);
