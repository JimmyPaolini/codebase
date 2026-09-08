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
 * The lattice address suffix {@link OutputPathService.build} appends, matched
 * where it sits in a filename that service has already written — so a reader
 * holding a committed path can recover the name the drawing carried before
 * an address was appended to it.
 *
 * A reader needs this because the two directions are not symmetrical.
 * Spelling an address into a filename needs the rendered document: the pitch
 * comes from the motif and the identifier is read off the ink. Taking one
 * back off needs nothing but the string.
 *
 * It matches both conventions and nothing else. The repeat count immediately
 * precedes the suffix in every filename `build` writes and no variant slug
 * spells `repeats`, so the lookbehind is what keeps this from biting into a
 * name that merely happens to end in something shaped like a shape. The
 * `mosaic` filenames `build` appends nothing to match nothing, and come back
 * unchanged.
 */
export const FILENAME_ADDRESS_SUFFIX_PATTERN =
  /(?<=-\d+-repeats)-\d+r\d+c(?:-[\da-f]+)?(?=\.svg$)/u;

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
 * `branch` (150 bytes), `cross` (54), and `negative` (58) hold comfortably
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
