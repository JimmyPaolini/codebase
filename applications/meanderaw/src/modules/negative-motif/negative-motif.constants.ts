// ♟️ Constants

import type {
  NegativeModifierName,
  NegativeSource,
} from "./negative-motif.types";

/**
 * Which source a `negative` drawn with no modifier inverts: the shortlist's
 * first entry, which the survey found to be the highest-branching
 * non-crossing pattern in the whole `mosaic` unit space. It is named here
 * rather than written inline so the default is a stated choice with a reason
 * rather than whichever branch a dispatch happened to fall through to.
 */
export const DEFAULT_NEGATIVE_SOURCE: NegativeSource = "stair";

/**
 * How many rows taller the source pattern is than the negative drawn from
 * it.
 *
 * It is one, and the reason is arithmetic rather than taste. A source of `n`
 * rows has `n` rows of cells between its lattice lines, and the negative
 * puts one lattice point on each of them — so the negative's own lattice has
 * `n` lines and therefore `n - 1` rows. Inverting a source drawn at the
 * negative's own row count would leave the bottom lattice row of the canvas
 * with no ink on it at all, which is invariant 2 broken for a bookkeeping
 * reason rather than a drawn one.
 *
 * A consequence worth knowing at the command line: asking for a `negative`
 * of 12 rows asks for the negative of a 13-row `mosaic`, one past the shared
 * `MAXIMUM_VALUE`. Nothing refuses it — `NegativeSourceService` builds its
 * tiles from a rule rather than from the enumeration — but no tile of that
 * size has ever been enumerated or surveyed, so it is outside everything
 * this family's own measurements cover.
 */
export const NEGATIVE_SOURCE_ROW_OFFSET = 1;

/**
 * Which shortlisted source each of this family's modifiers selects.
 *
 * `Record<NegativeModifierName, …>` is what makes the dispatch total: a
 * modifier this family declares compatible and forgets to map is a type
 * error, so {@link NegativeSourceService.source} has no branch left to fall
 * through. Anything outside this map is refused with
 * {@link UnknownNegativeSourceError} rather than quietly answered with
 * {@link DEFAULT_NEGATIVE_SOURCE}.
 */
export const NEGATIVE_SOURCES_BY_MODIFIER_NAME: Record<
  NegativeModifierName,
  NegativeSource
> = {
  brick: "brick",
  ruled: "ruled",
};

// 🚨 Errors

/**
 * Thrown when a modifier reaches the `negative` family that its own
 * `COMPATIBLE_MODIFIERS` entry does not name.
 *
 * `MeanderGenerationService.validateModifier` rejects such a modifier before
 * any motif service sees it, so nothing reaches this through `generate`. It
 * exists so that {@link NegativeSourceService.source} dispatches on the two
 * names it knows and refuses everything else, rather than treating an
 * unrecognized modifier as "no modifier" and quietly drawing the default
 * source — a bug that would read as the family ignoring a flag.
 */
export class UnknownNegativeSourceError extends Error {
  constructor(modifierName: string) {
    super(
      `modifier "${modifierName}" selects no negative source; the negative family draws from "brick", "ruled", or no modifier at all`,
    );
    this.name = "UnknownNegativeSourceError";
  }
}
