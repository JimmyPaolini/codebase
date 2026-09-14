// 🏷️ Types

import type { CombinedGraphExports } from "../map/map.types";
import type { FORMAT_NAMES } from "./combined-output.constants";

/**
 * What `--format` prints, derived from the list it is validated against —
 * see `FORMAT_NAMES`.
 */
export type CombinedOutputFormat = (typeof FORMAT_NAMES)[number];

/** Arguments for producing every combined output a run asked for. */
export interface CombinedOutputRunArguments {
  format: CombinedOutputFormat;
  graphs: CombinedGraphExports;
  jsonOutputPath: string | undefined;
  markdownOutputPath: string | undefined;
  workingDirectory: string;
}
