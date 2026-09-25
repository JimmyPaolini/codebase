import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  LIGHTSHIP_PORT: z.coerce.number().default(9000),
  PORT: z.coerce.number().default(3000),
});
