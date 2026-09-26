import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  APPLICATION_PORT: z.coerce.number().default(3000),
  LIGHTSHIP_PORT: z.coerce.number().default(9000),
});
