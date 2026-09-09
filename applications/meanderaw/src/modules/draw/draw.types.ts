// 🏷️ Types

import type { RungDirection } from "../branch-motif/branch-motif.types";
import type {
  MeanderType,
  Modifier,
  SerpentineFlip,
} from "../meander-generation/meander-generation.types";
import type { MosaicBuildableSubFamily } from "../mosaic-tile/mosaic-tile.types";

/**
 * Parsed `draw` options, in the shape nest-commander leaves them.
 *
 * Everything but `outputDirectory` and `repeatCount` is optional, and that is
 * the command's whole contract: `draw` with no drawing named sweeps every
 * meander the application can draw, and `draw --type <family> --rows <n>`
 * draws that one. `branches`, `direction`, `modifier`, and `strands` arrive
 * separately because nest-commander derives each option's key from its own
 * long flag — {@link DrawParametersService.modifier} is what puts them back
 * together.
 *
 * `direction` is one of the parameters whose absence is not a refusal:
 * `rung` takes `DEFAULT_RUNG_DIRECTION` where `stagger` and the
 * ply-carrying modifiers throw, because the direction it names is the one
 * every `rung` was drawn in before the other three were reachable.
 *
 * `subFamily` needs no such combining: it names a region of the family's
 * unit space on its own, and it is mutually exclusive with `modifier`, which
 * the generation service enforces. For `mosaic` it is also required — that
 * family draws no repeat unit for a modifier to adjust or a bare `--type`
 * to fall back on.
 */
export interface DrawCommandOptions {
  branches?: number;
  direction?: RungDirection;
  flip?: SerpentineFlip;
  modifier?: Modifier["name"];
  offset?: number;
  outputDirectory: string;
  repeatCount: number;
  rows?: number;
  strands?: number;

  subFamily?: MosaicBuildableSubFamily;
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
