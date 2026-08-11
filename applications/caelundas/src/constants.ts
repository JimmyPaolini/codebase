import { z } from "zod";

import { environmentSchema as inputEnvironmentSchema } from "./modules/input/input.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z.object({}).merge(inputEnvironmentSchema);
