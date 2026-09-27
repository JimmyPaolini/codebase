import type {
  LetterCharacteristicKey,
  SubmatrixWindow,
} from "../../characteristics.types";

// 🏷️ Types

/**
 * The corner a glyph's strokes run toward: the reading direction for a
 * script's base orientation, and a flip of it for each other corner.
 */
export type LetterCorner =
  | "Northeast"
  | "Northwest"
  | "Southeast"
  | "Southwest";

/**
 * Everything a letter service tells `LetterUtilitiesService.evaluators` to
 * build its sixteen evaluators from: the base `template`, drawn facing its
 * `script`'s base corner; the `glyph` as a description names it, such as
 * `A` or `凹 (hanzi ao)`; the upright glyph's `shape` in words; the `key`
 * each orientation name fills; and any `aliases` — other characters an
 * orientation also reads as, listed on every orientation drawing that ink.
 */
export interface LetterDefinition {
  readonly aliases?: Readonly<Partial<Record<LetterOrientationName, string>>>;
  readonly glyph: string;
  readonly key: (name: LetterOrientationName) => LetterCharacteristicKey;
  readonly script: LetterScript;
  readonly shape: string;
  readonly template: readonly string[];
}

/**
 * One of a letter's sixteen orientations: its corner, its clockwise rotation
 * applied after the corner's flip, the template drawn that way, and the
 * window that template fills.
 */
export interface LetterOrientation {
  readonly corner: LetterCorner;
  readonly name: LetterOrientationName;
  readonly rotation: LetterRotation;
  readonly template: readonly string[];
  readonly window: SubmatrixWindow;
}

/**
 * The key fragment naming an orientation: its corner, then its rotation word,
 * with no word for an unturned glyph.
 */
export type LetterOrientationName = `${LetterCorner}${"" | LetterTurn}`;

/** A clockwise rotation of a glyph, `None` leaving it unturned. */
export type LetterRotation = "None" | LetterTurn;

/** A script whose letters are drawn as glyph templates. */
export type LetterScript =
  | "Greek"
  | "Hangul"
  | "Hanzi"
  | "Hebrew"
  | "Katakana"
  | "Latin";

/** A clockwise turn of a glyph by a quarter, a half, or three quarters. */
export type LetterTurn = "Half" | "Quarter" | "ThreeQuarter";
