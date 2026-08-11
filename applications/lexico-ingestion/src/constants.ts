import { z } from "zod";

import { environmentSchema as lexicoIngestionEnvironmentSchema } from "./modules/lexico-ingestion/lexico-ingestion.constants";

// 🌱 Add environment schema fields here
export const environmentSchema = z
  .object({})
  .merge(lexicoIngestionEnvironmentSchema);
