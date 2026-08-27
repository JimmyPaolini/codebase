// ♟️ Constants

import type { Modifier } from "../meander-generation/meander-generation.types";

/**
 * Modifier names whose "edge" behavior closes the motif flush against the
 * canvas border: the shared repeat pitch widens from `rows - 1` grid levels
 * to `rows` grid levels (see {@link MotifTransformsService.closeEdge}).
 */
export const EDGE_FAMILY_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "edge",
  "edge-flip",
];

/**
 * Modifier names whose "flip" behavior mirrors alternating repeat units
 * (every odd `unitIndex`), rather than every unit like `spin-flip` does.
 * Bare `flip` is deliberately excluded: its mirrored twin is fused into
 * the SAME repeat unit (see
 * {@link SnakeSequenceService.unitPoints}'s `fusedFlipPoints`) rather than
 * alternating unit-by-unit, so every unit index looks identical once
 * translated — `edge-flip` is the only modifier that still alternates.
 */
export const FLIP_ALTERNATION_MODIFIER_NAMES: readonly Modifier["name"][] = [
  "edge-flip",
];
