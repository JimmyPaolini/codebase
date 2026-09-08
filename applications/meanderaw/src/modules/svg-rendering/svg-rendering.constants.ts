// ♟️ Constants

import type { MeanderType } from "../meander-generation/meander-generation.types";
import type { FilenameAddressConvention } from "./svg-rendering.types";

/** Stroke color every generated meander is drawn in. */
export const STROKE_COLOR = "black";

/** Stroke line cap every generated meander is drawn with. */
export const STROKE_LINECAP = "square";

/**
 * What a drawing with neither a modifier nor a sub-family is called in its
 * filename. The variant is what distinguishes one file from its siblings in
 * a family's row-count directory, so the unmodified drawing needs a name of
 * its own rather than an empty one.
 */
export const UNMODIFIED_VARIANT_NAME = "plain";

/**
 * Which of the two filename conventions each family measures under, decided
 * by measuring every combination `DrawCombinationsService.enumerate` draws
 * and finding the widest emitted filename it produces, in bytes.
 *
 * A family never mixes the two: the choice is this record rather than a
 * decision `OutputPathService` makes per drawing, so a family that newly
 * breaches 255 bytes fails the byte-length assertion loudly instead of
 * silently switching convention and renaming its whole directory.
 *
 * Measured against the corpus this repository commits today — not the
 * figures an earlier spike measured, which two prior pull requests moved:
 * `branch` (94 bytes), `cross` (54), and `negative` (58) hold comfortably
 * under the limit and keep `full-address`. `chain` and `snake` were
 * originally expected to fit at 246 bytes; `edge-flip` at 12 rows now widens
 * to 295 once its true multi-pitch repeat is spanned, so both moved to
 * `shape-only`. `boxes` (515 bytes, `spin-flip` at 12 rows), `parallel`
 * (566, `plied` at 12 strands), `swirl` (488, `flip` at 12 rows), and
 * `whirl` (290, `flip` at 12 rows) all breach by a wide margin and were
 * always `shape-only`.
 *
 * `mosaic` is declared `full-address` for completeness — every `MeanderType`
 * needs an entry — but this record is never consulted for it:
 * `DrawPermutationsService` already files every `mosaic` drawing under a
 * full address, spelled directly into the filename rather than appended by
 * `OutputPathService.build`, and `MotifPitchService` cannot derive a pitch
 * for a family with no motif to probe. `mosaic`'s filenames are therefore
 * untouched by this feature entirely, exactly as committed today.
 */
export const FILENAME_ADDRESS_CONVENTION: Readonly<
  Record<MeanderType, FilenameAddressConvention>
> = {
  boxes: "shape-only",
  branch: "full-address",
  chain: "shape-only",
  cross: "full-address",
  mosaic: "full-address",
  negative: "full-address",
  parallel: "shape-only",
  snake: "shape-only",
  swirl: "shape-only",
  whirl: "shape-only",
};
