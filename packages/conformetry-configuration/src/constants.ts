import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({});

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
      schemaPath: z.string(),
      targetPathStrategy: z.string(),
      templateDirectoryPath: z.string(),
    }),
  ),
});
