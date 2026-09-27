import type { SubmatrixWindow } from "../../characteristics.types";

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
