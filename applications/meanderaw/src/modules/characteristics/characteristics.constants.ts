// ♟️ Constants

/**
 * The key of every numeric characteristic an evaluator under `submatrix/`,
 * `path/`, or `compound/` fills, in alphabetical order. Each is the
 * `metadata.key` of exactly one registered evaluator whose `valueType` is
 * `"number"`, and `CharacteristicsModule`'s own test holds the two sets
 * equal in both directions.
 */
export const NUMERIC_CHARACTERISTIC_KEYS = [
  "aEastLetterCount",
  "aInvertedLetterCount",
  "aLetterCount",
  "aWestLetterCount",
  "aoEastHanziCount",
  "aoHanziCount",
  "aoInvertedHanziCount",
  "aoWestHanziCount",
  "bLetterCount",
  "bSidewaysLetterCount",
  "bettiNumber0Count",
  "bettiNumber1Count",
  "bottomBorderTouchCount",
  "cLetterCount",
  "cWestLetterCount",
  "cornerCount",
  "crossCount",
  "daletEastLetterCount",
  "daletInvertedLetterCount",
  "daletLetterCount",
  "daletWestLetterCount",
  "density",
  "dotCount",
  "doubleHorizontalEdgeCount",
  "doubleVerticalEdgeCount",
  "eDownLetterCount",
  "eLetterCount",
  "eUpLetterCount",
  "eWestLetterCount",
  "eastEdgeCount",
  "eastForkCount",
  "edgeCount",
  "embeddedUCount",
  "fDownLetterCount",
  "fLetterCount",
  "fUpLetterCount",
  "fWestLetterCount",
  "forkCount",
  "freeEndCount",
  "ganHanziCount",
  "hLetterCount",
  "hSidewaysLetterCount",
  "horizontalRectangleCount",
  "iLetterCount",
  "iSidewaysLetterCount",
  "inflectionCount",
  "inkPointCount",
  "jiaHanziCount",
  "jingHanziCount",
  "kieukEastHangulCount",
  "kieukHangulCount",
  "kieukInvertedHangulCount",
  "kieukWestHangulCount",
  "lDownLetterCount",
  "lLetterCount",
  "lUpLetterCount",
  "lWestLetterCount",
  "lamedLetterCount",
  "lamedSidewaysLetterCount",
  "longestHorizontalRunLength",
  "longestVerticalRunLength",
  "mEastLetterCount",
  "mLetterCount",
  "mWestLetterCount",
  "maxMonotonicTurnLength",
  "muHanziCount",
  "nLetterCount",
  "nSidewaysLetterCount",
  "northEastCornerCount",
  "northEdgeCount",
  "northForkCount",
  "northWestCornerCount",
  "oLetterCount",
  "phiLetterCount",
  "pieupHangulCount",
  "pieupSidewaysHangulCount",
  "psiEastLetterCount",
  "psiInvertedLetterCount",
  "psiLetterCount",
  "psiWestLetterCount",
  "rhoEastLetterCount",
  "rhoInvertedLetterCount",
  "rhoLetterCount",
  "rhoWestLetterCount",
  "sLetterCount",
  "sSidewaysLetterCount",
  "shangHanziCount",
  "shenHanziCount",
  "southEastCornerCount",
  "southEdgeCount",
  "southForkCount",
  "southWestCornerCount",
  "tEastLetterCount",
  "tLetterCount",
  "tUpLetterCount",
  "tWestLetterCount",
  "tavEastLetterCount",
  "tavInvertedLetterCount",
  "tavLetterCount",
  "tavWestLetterCount",
  "tianHanziCount",
  "tightestTurnCount",
  "tileCrossingComponentDeltaCount",
  "tileCrossingCount",
  "tileCrossingCycleCount",
  "topBorderTouchCount",
  "totalTurnCount",
  "tuEastHanziCount",
  "tuHanziCount",
  "tuInvertedHanziCount",
  "tuSoilHanziCount",
  "tuWestHanziCount",
  "uInvertedLetterCount",
  "uLetterCount",
  "verticalRectangleCount",
  "wLetterCount",
  "wangHanziCount",
  "wangSidewaysHanziCount",
  "westEdgeCount",
  "westForkCount",
  "xLetterCount",
  "yEastLetterCount",
  "yLetterCount",
  "yUpLetterCount",
  "yWestLetterCount",
  "yaHangulCount",
  "yeoHangulCount",
  "yoHangulCount",
  "youHanziCount",
  "yuEastKatakanaCount",
  "yuHangulCount",
  "yuInvertedKatakanaCount",
  "yuKatakanaCount",
  "yuWestKatakanaCount",
  "zLetterCount",
  "zSidewaysLetterCount",
] as const;

/**
 * The key of every boolean characteristic, in alphabetical order — the
 * `metadata.key` of exactly one registered evaluator whose `valueType` is
 * `"boolean"`.
 */
export const BOOLEAN_CHARACTERISTIC_KEYS = [
  "endsAreLatticeNeighbors",
  "endsOnBorderRules",
  "isArcade",
  "isBars",
  "isBoxes",
  "isChain",
  "isClasps",
  "isClosedLoop",
  "isComb",
  "isCross",
  "isDots",
  "isDoubleChain",
  "isFork",
  "isLines",
  "isMesh",
  "isParallel",
  "isPureTree",
  "isSingleArc",
  "isSnake",
  "isStippled",
  "isSwirl",
  "isWaterfalls",
  "isWhirl",
  "reversesAtItsTightestTurn",
] as const;

/**
 * Every characteristic key, numeric keys first and boolean keys after, each
 * run alphabetical — the order `CharacteristicsService` lists
 * metadata in and fills a record in.
 */
export const CHARACTERISTIC_KEYS = [
  ...NUMERIC_CHARACTERISTIC_KEYS,
  ...BOOLEAN_CHARACTERISTIC_KEYS,
] as const;

/**
 * {@link BOOLEAN_CHARACTERISTIC_KEYS} as a set of plain strings, so an
 * unchecked key read off a discovered provider can be looked up without
 * first being narrowed to the key union it is being checked against.
 */
export const BOOLEAN_CHARACTERISTIC_KEY_SET: ReadonlySet<string> = new Set(
  BOOLEAN_CHARACTERISTIC_KEYS,
);

/** {@link CHARACTERISTIC_KEYS} as a set of plain strings, for the same reason. */
export const CHARACTERISTIC_KEY_SET: ReadonlySet<string> = new Set(
  CHARACTERISTIC_KEYS,
);

/**
 * Thrown when the evaluators registered with `CharacteristicsModule`
 * disagree with the key lists above — a key with no evaluator, an evaluator
 * whose key is unknown or claimed twice, or a value of the wrong type — so
 * a record is never filled with a field missing or mistyped.
 */
export class CharacteristicRegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacteristicRegistryError";
  }
}
