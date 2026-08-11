import { z } from "zod";

import { environmentSchema as synchronizationEnvironmentSchema } from "./modules/synchronization/synchronization.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z
  .object({})
  .merge(synchronizationEnvironmentSchema);
