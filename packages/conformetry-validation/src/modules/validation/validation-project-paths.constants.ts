export const CONFORMETRY_NX_PLUGIN_NAME = "@jimmypaolini/conformetry-nx";
export const NX_JSON_FILENAME = "nx.json";
export const PROJECT_METADATA_FILENAME = "project.json";
export const PLUGIN_SCOPED_RULE_NAMES = [
  "json",
  "markdown",
  "python",
  "text",
  "typescript",
] as const;
export const SKIPPED_DIRECTORY_NAMES = new Set<string>([
  ".git",
  "dist",
  "node_modules",
]);
