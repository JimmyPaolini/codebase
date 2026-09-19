import { z } from "zod";

// ♟️ Constants

/** The relative path to the root package.json file. */
export const PACKAGE_JSON_PATH = "package.json";

/** The relative path to the root README.md file. */
export const ROOT_README_PATH = "README.md";

/** Regular expression matching the top-level codebase header in README.md. */
export const README_TITLE_REGEXP = /^# (?:Codebase|codebase)(?: v\S+)?/m;

/** Schema for validating the version field in package.json. */
export const PACKAGE_JSON_SCHEMA = z.object({
  version: z.string().min(1),
});
