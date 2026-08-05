import type { ConformetryValidatorPlugin } from "@jimmypaolini/conformetry-configuration";

// ♟️ Constants
export const TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS = [".ts", ".tsx"];

export const TYPESCRIPT_VALIDATOR_PLUGIN_DESCRIPTOR: ConformetryValidatorPlugin["descriptor"] =
  {
    description: "Checks TypeScript AST structure and required comments",
    fileExtensions: [...TYPESCRIPT_VALIDATOR_FILE_EXTENSIONS],
    name: "typescript",
  };

export const TODO_LINE_REGEX = /\bTODO\b/u;
