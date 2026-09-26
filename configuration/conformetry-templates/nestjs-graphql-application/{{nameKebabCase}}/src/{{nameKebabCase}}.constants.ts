import { z } from "zod";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({
  {{nameConstantCase}}_LIGHTSHIP_PORT: z.coerce.number().default(9000),
  {{nameConstantCase}}_PORT: z.coerce.number().default(3000),
});
