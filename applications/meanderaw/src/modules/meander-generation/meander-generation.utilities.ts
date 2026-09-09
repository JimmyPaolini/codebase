// 🛠️ Utilities

import { TILE_DRAWN_TYPES } from "./meander-generation.constants";

import type { MeanderType, MotifDrawnType } from "./meander-generation.types";

/**
 * Narrows a family to one that draws a motif, so a pitch — and through it a
 * lattice address — can be asked for it.
 *
 * It sits beside the constant it reads rather than in each of the five
 * places that asked the question: the command's rendering path, the sweep's
 * own filename assertions, the committed corpus the address table walks,
 * and the two suites that sweep pitches and addresses directly. Every copy
 * of this predicate is another place a new tile-drawn family has to be
 * remembered.
 */
export function isMotifDrawnType(type: MeanderType): type is MotifDrawnType {
  return !TILE_DRAWN_TYPES.includes(type);
}
