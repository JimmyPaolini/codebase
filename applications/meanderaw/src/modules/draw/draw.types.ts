// 🏷️ Types

import type {
  DotShape,
  MeanderType,
  Modifier,
  SerpentineFlip,
} from "../meander-generation/meander-generation.types";
import type { MosaicBuildableSubFamily } from "../mosaic-motif/mosaic-motif.types";

/**
 * Parsed `draw` options, in the shape nest-commander leaves them.
 *
 * Everything but `outputDirectory` and `repeatCount` is optional, and that is
 * the command's whole contract: `draw` with no drawing named sweeps every
 * meander the application can draw, and `draw --type <family> --rows <n>`
 * draws that one. `branches`, `leftward`, `modifier`, `period`, `shape`,
 * `strands`, and `upward` arrive
 * separately because nest-commander derives each option's key from its own
 * long flag — {@link DrawParametersService.modifier} is what puts them back
 * together.
 *
 * `leftward` and `upward` are the two parameters whose absence is not a
 * refusal. Both are booleans, and commander cannot distinguish a flag left
 * off from one passed `false`, so `rung` and `comb` take
 * {@link DEFAULT_RUNG_IS_LEFTWARD} and {@link DEFAULT_COMB_IS_UPWARD} where
 * the others throw.
 *
 * `subFamily` needs no such combining: it names a region of the family's
 * unit space on its own, and it is mutually exclusive with `modifier`, which
 * the generation service enforces.
 */
export interface DrawCommandOptions {
  branches?: number;
  flip?: SerpentineFlip;
  leftward?: boolean;
  modifier?: Modifier["name"];
  offset?: number;
  outputDirectory: string;
  period?: number;
  repeatCount: number;
  rows?: number;
  shape?: DotShape;
  strands?: number;
  subFamily?: MosaicBuildableSubFamily;
  type?: MeanderType;
  upward?: boolean;
}

/**
 * One document the sweep wrote, as the index page lists it: the directory it
 * landed in, relative to the output directory, and its filename within that
 * directory. Both halves of the sweep produce this shape, so the page lists
 * them together without knowing which half produced what.
 */
export interface OutputDocument {
  readonly directory: string;
  readonly fileName: string;
}

/** One drawing ready to be written: where it goes, and the document itself. */
export interface RenderedDocument extends OutputDocument {
  readonly svg: string;
}
