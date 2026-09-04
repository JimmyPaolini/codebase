// 🏷️ Types

import type {
  DotShape,
  MeanderType,
  Modifier,
} from "../meander-generation/meander-generation.types";
import type { MosaicSubFamily } from "../mosaic-motif/mosaic-motif.types";

/**
 * Parsed `draw` options, in the shape nest-commander leaves them.
 *
 * Everything but `outputDirectory` and `repeatCount` is optional, and that is
 * the command's whole contract: `draw` with no drawing named sweeps every
 * meander the application can draw, and `draw --type <family> --rows <n>`
 * draws that one. `modifier`, `period`, `shape`, and `strands` arrive
 * separately because nest-commander derives each option's key from its own
 * long flag — {@link DrawParametersService.modifier} is what puts them back
 * together.
 *
 * `subFamily` needs no such combining: it names a region of the family's
 * unit space on its own, and it is mutually exclusive with `modifier`, which
 * the generation service enforces.
 */
export interface DrawCommandOptions {
  modifier?: Modifier["name"];
  outputDirectory: string;
  period?: number;
  repeatCount: number;
  rows?: number;
  shape?: DotShape;
  strands?: number;
  subFamily?: MosaicSubFamily;
  type?: MeanderType;
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
