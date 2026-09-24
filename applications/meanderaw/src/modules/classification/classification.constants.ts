// ♟️ Constants

import type { MeanderFamily } from "./classification.types";

/**
 * Supported meander families with precedence:
 * parallel -\> cross -\> arcade -\> comb -\> fork -\> tree -\> boxes -\> whirl -\> swirl -\> chain -\> clasps -\> snake -\> stipple -\> unclassified.
 */
export const MEANDER_FAMILIES: readonly MeanderFamily[] = [
  "parallel",
  "cross",
  "arcade",
  "comb",
  "fork",
  "tree",
  "boxes",
  "whirl",
  "swirl",
  "chain",
  "clasps",
  "snake",
  "stipple",
  "unclassified",
];

/**
 * The shallowest band each family's structure can exist in.
 */
export const STRUCTURAL_MINIMUM_ROWS: Record<MeanderFamily, number> = {
  arcade: 2,
  boxes: 3,
  chain: 3,
  clasps: 3,
  comb: 2,
  cross: 6,
  fork: 3,
  parallel: 2,
  snake: 3,
  stipple: 2,
  swirl: 3,
  tree: 3,
  unclassified: 1,
  whirl: 3,
};
