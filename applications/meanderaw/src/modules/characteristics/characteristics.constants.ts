// cspell:ignore Neighbours
// ♟️ Constants

import type { Characteristics } from "./characteristics.types";

/**
 * Records whether each characteristic is derived from a pattern in the Code
 * or by walking the grid as a graph.
 */
export const CHARACTERISTIC_SOURCES: Record<
  keyof Characteristics,
  "pattern" | "walk"
> = {
  // Graph
  components: "walk",
  componentCount: "walk",
  cornerCount: "pattern",
  // Seam
  crossesTheSeam: "walk",
  cycles: "walk",
  cycleCount: "walk",
  density: "pattern",
  // Digit histogram
  dotCount: "pattern",
  edgeCount: "pattern",
  embeddedOCount: "pattern",
  // Embedded unit shapes
  embeddedUCount: "pattern",
  // cspell:ignore Neighbours
  endsAreLatticeNeighbours: "walk",
  endsOnBorderRules: "walk",
  freeEnds: "walk",
  hasBranching: "pattern",
  hasCrossing: "pattern",
  hasDots: "pattern",
  hasTJunctions: "pattern",
  hasXJunctions: "pattern",
  // Isolated unit shapes
  horizontalDashCount: "pattern",
  horizontalPointCount: "pattern",
  inkPointCount: "pattern",
  inkTJunctions: "pattern",
  inkXJunctions: "pattern",
  // Family-defining
  isClosedLoop: "walk",
  isConnected: "walk",
  isFlipSymmetric: "pattern",
  isJunctionFree: "pattern",
  isMirrorSymmetric: "pattern",
  // Structure
  isReducible: "pattern",
  isSingleArc: "walk",
  lCount: "pattern",
  // Runs
  longestHorizontalRun: "pattern",
  longestVerticalRun: "pattern",
  negativeTJunctions: "pattern",
  negativeXJunctions: "pattern",
  oCount: "pattern",
  pitch: "pattern",
  plusCount: "pattern",
  reversesAtItsTightestTurn: "walk",
  seamComponents: "walk",
  seamCycles: "walk",
  seamTJunctions: "walk",
  seamXJunctions: "walk",
  shapeICount: "pattern",
  tCount: "pattern",
  turnsMonotonically: "walk",
  uCount: "pattern",
  verticalDashCount: "pattern",
  verticalPointCount: "pattern",
  xCount: "pattern",
};
