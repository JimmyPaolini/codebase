// ♟️ Constants

import type { MeanderFamily } from "./classification.types";

/**
 * Supported meander families with precedence:
 * parallel -\> cross -\> branch -\> boxes -\> whirl -\> swirl -\> chain -\> snake -\> unclassified.
 */
export const MEANDER_FAMILIES: readonly MeanderFamily[] = [
  "parallel",
  "cross",
  "branch",
  "boxes",
  "whirl",
  "swirl",
  "chain",
  "snake",
  "unclassified",
];

/**
 * The shallowest band each family's structure can exist in.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderFamily, number> = {
  boxes: 3,
  branch: 3,
  chain: 4,
  cross: 6,
  parallel: 2,
  snake: 4,
  swirl: 4,
  unclassified: 1,
  whirl: 4,
};
