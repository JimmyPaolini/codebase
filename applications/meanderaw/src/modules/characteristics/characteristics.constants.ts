import { LETTER_ORIENTATION_NAMES } from "./submatrix/letter/letter.constants";

// ♟️ Constants

/**
 * The key of every numeric characteristic stored under a column of its own
 * on a meander row, in alphabetical order: every numeric key but a letter's.
 *
 * A letter glyph count — any script, hanzi and hangul included — is instead
 * marked `letter: true` in its evaluator's metadata and stored in the row's
 * `glyphs` map, because the letters alone outnumber the columns one table
 * holds. `CharacteristicsService` refuses to boot unless the two agree: a
 * numeric evaluator is marked a letter exactly when its key is missing here.
 * So a new letter needs keys in `LETTER_CHARACTERISTIC_KEYS` and no storage
 * change, and a new non-letter numeric characteristic needs an entry here and a `Meander`
 * column, which the entity's `implements` clause holds complete.
 */
export const COLUMN_CHARACTERISTIC_KEYS = [
  "bettiNumber0Count",
  "bettiNumber1Count",
  "bottomBorderTouchCount",
  "cornerCount",
  "crossCount",
  "density",
  "dotCount",
  "doubleHorizontalEdgeCount",
  "doubleVerticalEdgeCount",
  "eastEdgeCount",
  "eastForkCount",
  "edgeCount",
  "embeddedUCount",
  "forkCount",
  "freeEndCount",
  "horizontalRectangleCount",
  "inflectionCount",
  "inkPointCount",
  "longestHorizontalRunLength",
  "longestVerticalRunLength",
  "maxMonotonicTurnLength",
  "northEastCornerCount",
  "northEdgeCount",
  "northForkCount",
  "northWestCornerCount",
  "southEastCornerCount",
  "southEdgeCount",
  "southForkCount",
  "southWestCornerCount",
  "tightestTurnCount",
  "tileCrossingComponentDeltaCount",
  "tileCrossingCount",
  "tileCrossingCycleCount",
  "topBorderTouchCount",
  "totalTurnCount",
  "verticalRectangleCount",
  "westEdgeCount",
  "westForkCount",
] as const;

/**
 * The key of every letter glyph count, sixteen per letter: the letter's
 * transliteration, one of its sixteen orientation names, and its script —
 * `<letter><Corner>[Quarter|Half|ThreeQuarter]<Script>Count`, such as
 * `aSoutheastLatinCount` or `daletSouthwestHalfHebrewCount`. Letters run
 * alphabetically, and each letter's keys in `LETTER_ORIENTATION_NAMES` order.
 * Each is the `metadata.key` of one evaluator a letter service provides.
 */
export const LETTER_CHARACTERISTIC_KEYS = [
  ...LETTER_ORIENTATION_NAMES.map((name) => `a${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `ao${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `b${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `c${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `dalet${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `delta${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `e${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `f${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `gan${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `h${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `i${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `jia${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `jing${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `kappa${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `kieuk${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `l${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `lambda${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `lamed${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `m${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `mu${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `n${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `o${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `omega${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `phi${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `pieup${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `psi${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `rho${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `s${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `shang${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `shen${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `sigma${name}GreekCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `t${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tav${name}HebrewCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tian${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tu${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `tuSoil${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `u${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `w${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `wang${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `x${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `y${name}LatinCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `ya${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yeo${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yo${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `you${name}HanziCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yu${name}HangulCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `yu${name}KatakanaCount` as const),
  ...LETTER_ORIENTATION_NAMES.map((name) => `z${name}LatinCount` as const),
] as const;

/**
 * The key of every numeric characteristic an evaluator under `submatrix/`,
 * `path/`, or `compound/` fills — every column key and every letter key — in
 * alphabetical order. Each is the `metadata.key` of exactly one registered
 * evaluator whose `valueType` is `"number"`, and `CharacteristicsModule`'s
 * own test holds the two sets equal in both directions.
 */
export const NUMERIC_CHARACTERISTIC_KEYS = [
  ...COLUMN_CHARACTERISTIC_KEYS,
  ...LETTER_CHARACTERISTIC_KEYS,
].toSorted();

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

/** {@link COLUMN_CHARACTERISTIC_KEYS} as a set of plain strings, for the same reason as {@link BOOLEAN_CHARACTERISTIC_KEY_SET}. */
export const COLUMN_CHARACTERISTIC_KEY_SET: ReadonlySet<string> = new Set(
  COLUMN_CHARACTERISTIC_KEYS,
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
