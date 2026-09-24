// cspell:ignore ccab ccbb

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
  arcadePillarCount: "pattern",
  bifurcationCount: "pattern",
  combSpineCount: "pattern",
  componentCount: "walk",
  components: "walk",
  cornerCount: "pattern",
  // Seam
  crossesTheSeam: "walk",
  cycleCount: "walk",
  cycles: "walk",
  density: "pattern",
  // Digit histogram
  dotCount: "pattern",
  edgeCount: "pattern",
  embeddedOCount: "pattern",
  // Embedded unit shapes
  embeddedUCount: "pattern",
  endsAreLatticeNeighbors: "walk",
  endsOnBorderRules: "walk",
  freeEnds: "walk",
  hasArcadePillars: "pattern",
  hasBranching: "pattern",
  hasCombSpine: "pattern",
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
  isFork: "walk",
  isJunctionFree: "pattern",
  isMirrorSymmetric: "pattern",
  isPureTree: "walk",
  // Structure
  isReducible: "pattern",
  isSingleArc: "walk",
  isStippled: "walk",
  lCount: "pattern",
  // Runs
  longestHorizontalRun: "pattern",
  longestVerticalRun: "pattern",
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

/**
 * Maps 4-digit hexadecimal 2x2 window strings to the corresponding unit shape count key.
 */
export const ISOLATED_SHAPE_MAP: Readonly<
  Record<
    string,
    | "arcadePillarCount"
    | "bifurcationCount"
    | "combSpineCount"
    | "horizontalDashCount"
    | "lCount"
    | "oCount"
    | "plusCount"
    | "shapeICount"
    | "uCount"
    | "verticalDashCount"
  >
> = {
  "00bb": "combSpineCount",
  "2d2d": "combSpineCount",
  "9a56": "plusCount",
  "1e1e": "combSpineCount",
  "0021": "horizontalDashCount",
  "40a1": "lCount",
  "44a9": "uCount",
  "44ad": "bifurcationCount",
  "44da": "bifurcationCount",
  "46cc": "arcadePillarCount",
  "54cc": "arcadePillarCount",
  "61a1": "uCount",
  "65a9": "oCount",
  "67cc": "arcadePillarCount",
  "75cc": "arcadePillarCount",
  "77cc": "combSpineCount",
  "0408": "verticalDashCount",
  "0429": "lCount",
  "2100": "horizontalDashCount",
  "2121": "shapeICount",
  "2508": "lCount",
  "2529": "uCount",
  "4080": "verticalDashCount",
  "4488": "shapeICount",
  "6180": "lCount",
  "6588": "uCount",
  "7700": "combSpineCount",
  ad44: "bifurcationCount",
  cc8a: "arcadePillarCount",
  cc98: "arcadePillarCount",
  ccab: "arcadePillarCount",
  ccb9: "arcadePillarCount",
  ccbb: "combSpineCount",
  d2d2: "combSpineCount",
  da44: "bifurcationCount",
  e1e1: "combSpineCount",
  ed8a: "bifurcationCount",
  eda8: "bifurcationCount",
};
