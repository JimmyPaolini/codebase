import type {
  BooleanCharacteristicKey,
  Characteristics,
  NumericCharacteristicRecord,
} from "../src/modules/characteristics/characteristics.types";
import type { CodeObject } from "../src/modules/code/code.types";
import type { MeanderRecord } from "../src/modules/database/database.types";

/**
 * Builds characteristic records and meander rows for the tests that need a
 * whole one written out, so a case spells out only the fields it is about.
 *
 * Each list is written out in full rather than derived from the key lists,
 * so the compiler checks it against the record types: adding a
 * characteristic key fails here until its default is added.
 */

// 🔧 Configuration

/** Every numeric characteristic at zero. */
export const ZERO_NUMERIC_CHARACTERISTICS: NumericCharacteristicRecord = {
  aEastLetterCount: 0,
  aInvertedLetterCount: 0,
  aLetterCount: 0,
  aoEastHanziCount: 0,
  aoHanziCount: 0,
  aoInvertedHanziCount: 0,
  aoWestHanziCount: 0,
  aWestLetterCount: 0,
  bettiNumber0Count: 0,
  bettiNumber1Count: 0,
  bLetterCount: 0,
  bottomBorderTouchCount: 0,
  bSidewaysLetterCount: 0,
  cLetterCount: 0,
  cornerCount: 0,
  crossCount: 0,
  cWestLetterCount: 0,
  daletEastLetterCount: 0,
  daletInvertedLetterCount: 0,
  daletLetterCount: 0,
  daletWestLetterCount: 0,
  density: 0,
  dotCount: 0,
  doubleHorizontalEdgeCount: 0,
  doubleVerticalEdgeCount: 0,
  eastEdgeCount: 0,
  eastForkCount: 0,
  edgeCount: 0,
  eDownLetterCount: 0,
  eLetterCount: 0,
  embeddedUCount: 0,
  eUpLetterCount: 0,
  eWestLetterCount: 0,
  fDownLetterCount: 0,
  fLetterCount: 0,
  forkCount: 0,
  freeEndCount: 0,
  fUpLetterCount: 0,
  fWestLetterCount: 0,
  hLetterCount: 0,
  horizontalRectangleCount: 0,
  hSidewaysLetterCount: 0,
  iLetterCount: 0,
  inflectionCount: 0,
  inkPointCount: 0,
  iSidewaysLetterCount: 0,
  kieukEastHangulCount: 0,
  kieukHangulCount: 0,
  kieukInvertedHangulCount: 0,
  kieukWestHangulCount: 0,
  lamedLetterCount: 0,
  lamedSidewaysLetterCount: 0,
  lDownLetterCount: 0,
  lLetterCount: 0,
  longestHorizontalRunLength: 0,
  longestVerticalRunLength: 0,
  lUpLetterCount: 0,
  lWestLetterCount: 0,
  maxMonotonicTurnLength: 0,
  mEastLetterCount: 0,
  mLetterCount: 0,
  mWestLetterCount: 0,
  nLetterCount: 0,
  northEastCornerCount: 0,
  northEdgeCount: 0,
  northForkCount: 0,
  northWestCornerCount: 0,
  nSidewaysLetterCount: 0,
  oLetterCount: 0,
  pieupHangulCount: 0,
  pieupSidewaysHangulCount: 0,
  sLetterCount: 0,
  southEastCornerCount: 0,
  southEdgeCount: 0,
  southForkCount: 0,
  southWestCornerCount: 0,
  sSidewaysLetterCount: 0,
  tavEastLetterCount: 0,
  tavInvertedLetterCount: 0,
  tavLetterCount: 0,
  tavWestLetterCount: 0,
  tEastLetterCount: 0,
  tianHanziCount: 0,
  tightestTurnCount: 0,
  tileCrossingComponentDeltaCount: 0,
  tileCrossingCount: 0,
  tileCrossingCycleCount: 0,
  tLetterCount: 0,
  topBorderTouchCount: 0,
  totalTurnCount: 0,
  tuEastHanziCount: 0,
  tuHanziCount: 0,
  tuInvertedHanziCount: 0,
  tUpLetterCount: 0,
  tuWestHanziCount: 0,
  tWestLetterCount: 0,
  uInvertedLetterCount: 0,
  uLetterCount: 0,
  verticalRectangleCount: 0,
  wangHanziCount: 0,
  wangSidewaysHanziCount: 0,
  westEdgeCount: 0,
  westForkCount: 0,
  wLetterCount: 0,
  xLetterCount: 0,
  yEastLetterCount: 0,
  yLetterCount: 0,
  yuEastKatakanaCount: 0,
  yuInvertedKatakanaCount: 0,
  yuKatakanaCount: 0,
  yUpLetterCount: 0,
  yuWestKatakanaCount: 0,
  yWestLetterCount: 0,
  zLetterCount: 0,
  zSidewaysLetterCount: 0,
};

/** Every boolean characteristic false. */
const FALSE_BOOLEAN_CHARACTERISTICS: Readonly<
  Record<BooleanCharacteristicKey, boolean>
> = {
  endsAreLatticeNeighbors: false,
  endsOnBorderRules: false,
  isArcade: false,
  isBars: false,
  isBoxes: false,
  isChain: false,
  isClasps: false,
  isClosedLoop: false,
  isComb: false,
  isCross: false,
  isDots: false,
  isDoubleChain: false,
  isFork: false,
  isLines: false,
  isMesh: false,
  isParallel: false,
  isPureTree: false,
  isSingleArc: false,
  isSnake: false,
  isStippled: false,
  isSwirl: false,
  isWaterfalls: false,
  isWhirl: false,
  reversesAtItsTightestTurn: false,
};

// 🌎 Utilities

/** A whole characteristic record: every number zero and every boolean false, except the fields `overrides` names. */
export function characteristicRecord(
  overrides: Partial<Characteristics> = {},
): Characteristics {
  return {
    ...ZERO_NUMERIC_CHARACTERISTICS,
    ...FALSE_BOOLEAN_CHARACTERISTICS,
    ...overrides,
  };
}

/** A whole meander row at a one-column, two-row shape with every characteristic zero, except the fields `overrides` names. */
export function meanderRecord(
  overrides: Partial<MeanderRecord> & Pick<MeanderRecord, "code">,
): MeanderRecord {
  return {
    ...ZERO_NUMERIC_CHARACTERISTICS,
    characteristics: [],
    columns: 1,
    drawingHash: "hash",
    family: "unclassified",
    lattice: "0",
    provenance: "hardcoded",
    repeats: 1,
    rows: 2,
    ...overrides,
  };
}

/** The Code drawn `times` over side by side: each row repeated, columns multiplied. */
export function tiled(code: CodeObject, times: number): CodeObject {
  const rows = Array.from({ length: code.rows }, (_unused, row) =>
    code.digits
      .slice(row * code.columns, (row + 1) * code.columns)
      .repeat(times),
  );

  return { ...code, columns: code.columns * times, digits: rows.join("") };
}
