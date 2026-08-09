import { z } from "zod";

/**
 * Raised when the configuration path points to an unsupported file type.
 */
export class UnknownConfigurationFileTypeError extends Error {
  constructor(filePath: string) {
    super(`Unsupported configuration file type: ${filePath}`);
    this.name = "UnknownConfigurationFileTypeError";
  }
}

/**
 * Supported configuration file extensions for conformetry config loading.
 */
export const supportedExtensions = new Set([
  ".cjs",
  ".cts",
  ".js",
  ".json",
  ".jsonc",
  ".mjs",
  ".mts",
  ".ts",
]);

export const DEFAULT_CONFIGURATION_PATH = "configuration/conformetry.config.ts";

export const DEFAULT_GENERATED_OUTPUT_DIRECTORY = "generated";

export const RESERVED_GENERATOR_OPTION_NAMES = new Set([
  "config",
  "description",
  "help",
  "name",
  "targetDirectoryPath",
]);

export const TARGET_DIRECTORY_OPTION_KEYS = [
  "targetDirectoryPath",
  "outputDirectoryPath",
  "outputPath",
] as const;

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
 * Validates the declarative generator registry loaded from conformetry config files.
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
      parameters: z.record(z.string(), jsonSchemaDefinitionSchema).optional(),
    }),
  ),
});
