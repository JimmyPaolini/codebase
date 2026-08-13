// ♟️ Constants

import { z } from "zod";

/** Raised when the configuration path points to an unsupported file type. */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/** Config path used when the caller supplies none. */
export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

/**
 * Directory holding generator templates, relative to the workspace root.
 *
 * Used to derive `templateDirectoryPath` for a generator that does not declare
 * one, by joining this with the generator's registry key.
 */
export const DEFAULT_TEMPLATE_DIRECTORY = "configuration/conformetry-templates";

/** Marks the workspace root during an upward search from the process cwd. */
export const WORKSPACE_MANIFEST_FILENAME = "pnpm-workspace.yaml";

/** Extensions the config loader can read. */
export const SUPPORTED_CONFIGURATION_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

/** Any JSON value, used to accept arbitrary JSON Schema parameter fragments. */
const jsonSchemaDefinitionSchema: z.ZodType = z.lazy(() => {
  return z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonSchemaDefinitionSchema),
    z.record(z.string(), jsonSchemaDefinitionSchema),
  ]);
});

/**
 * Validates the declarative generator registry loaded from a config file.
 *
 * `templateDirectoryPath` is part of the schema deliberately: Zod strips
 * unknown keys, so omitting it here would silently discard a path the author
 * wrote in their config.
 */
export const conformetryConfigurationSchema = z.object({
  generators: z.record(
    z.string(),
    z.object({
      aliases: z.array(z.string()).optional(),
      description: z.string().optional(),
      hooks: z
        .object({
          postGenerate: z.object({ name: z.string() }).optional(),
          preGenerate: z.object({ name: z.string() }).optional(),
        })
        .optional(),
      name: z.string(),
      // Each parameter is a JSON Schema fragment, so it must be an object;
      // its own fields may hold any JSON value.
      parameters: z
        .record(z.string(), z.record(z.string(), jsonSchemaDefinitionSchema))
        .optional(),
      templateDirectoryPath: z.string().optional(),
    }),
  ),
});
