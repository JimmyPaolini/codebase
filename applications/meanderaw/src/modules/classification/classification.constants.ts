// ♟️ Constants

import type { MeanderFamily } from "./classification.types";

/**
 * Supported meander families with precedence:
 * parallel -\> cross -\> branch -\> boxes -\> chain -\> double-chain -\> waterfalls -\> whirl -\> swirl -\> clasps -\> snake -\> unclassified.
 */
export const MEANDER_FAMILIES: readonly MeanderFamily[] = [
  "parallel",
  "cross",
  "branch",
  "boxes",
  "chain",
  "double-chain",
  "waterfalls",
  "whirl",
  "swirl",
  "clasps",
  "snake",
  "unclassified",
];

/**
 * The shallowest band each family's structure can exist in.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderFamily, number> = {
  boxes: 4,
  branch: 3,
  chain: 3,
  clasps: 3,
  cross: 6,
  "double-chain": 3,
  parallel: 2,
  snake: 3,
  swirl: 3,
  unclassified: 1,
  waterfalls: 2,
  whirl: 3,
};
