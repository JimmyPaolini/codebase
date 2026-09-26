import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  APPLICATION_PORT: z.coerce.number().default(8398),
  LIGHTSHIP_PORT: z.coerce.number().default(9000),
  POSTGRES_DB: z.string().default("postgres"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PASSWORD: z.string().default("postgres"),
  POSTGRES_PORT: z.coerce.number().default(5432),
  POSTGRES_USER: z.string().default("postgres"),
});
