// ♟️ Constants

import type {
  NegativeColumnMark,
  NegativeColumnSource,
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
 * The repeating motif each one-column source is built from, as marks
 * running down a single column of the source tile.
 *
 * The alphabet is two things: an **opening**, which leaves a corridor for
 * the negative to ink — `dot` opening one lattice level, `vertical` opening
 * two — and a **closed rule**, the `line` that walls a level off. A motif
 * is repeated down the interior and truncated wherever it runs out of room,
 * so every one of these is defined at every row count rather than only at
 * the ones its own period divides.
 *
 * Reading the seven as one alphabet is what makes them a family rather than
 * seven patterns. `ruled` and `ruled-raised` are the same motif in opposite
 * phase, `ruled-spaced` widens the rule between openings, `ruled-tall`
 * trades a one-level opening for a two-level one, and the two degenerate
 * members sit at either end: `ruled-closed` has no opening at all, `grid`
 * nothing but openings.
 *
 * Where the openings fall decides whether the drawing crosses, and the rule
 * is exact: two adjacent openings stack two corridors in one lattice column,
 * which is an X-junction. Every motif here separates its openings by at
 * least one rule except `grid`, which is why `grid` is the only one-column
 * source that crosses — and `brick-upright`, whose `vertical` openings are
 * adjacent because each spans two levels, is the reason the rule is about
 * adjacency rather than about counting rules.
 */
export const NEGATIVE_COLUMN_MOTIFS: Record<
  NegativeColumnSource,
  readonly [NegativeColumnMark, ...NegativeColumnMark[]]
> = {
  "brick-upright": ["vertical"],
  grid: ["dot"],
  ruled: ["dot", "line"],
  "ruled-closed": ["line"],
  "ruled-raised": ["line", "dot"],
  "ruled-spaced": ["dot", "line", "line"],
  "ruled-tall": ["line", "vertical"],
};

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
 * Which source each of this family's modifiers selects.
 *
 * `Record<NegativeModifierName, …>` is what makes the dispatch total: a
 * modifier this family declares compatible and forgets to map is a type
 * error, so {@link NegativeSourceService.source} has no branch left to fall
 * through. Anything outside this map is refused with
 * {@link UnknownNegativeSourceError} rather than quietly answered with
 * {@link DEFAULT_NEGATIVE_SOURCE}.
 *
 * Every modifier names the source it selects, which reads as ceremony until
 * you notice the one name missing from it: `stair` is a source with no
 * modifier, so the two vocabularies are the same size only by coincidence
 * and the map is what says which of them a caller is holding.
 */
export const NEGATIVE_SOURCES_BY_MODIFIER_NAME: Record<
  NegativeModifierName,
  NegativeSource
> = {
  "brick-staggered": "brick-staggered",
  "brick-straight": "brick-straight",
  "brick-upright": "brick-upright",
  grid: "grid",
  ruled: "ruled",
  "ruled-closed": "ruled-closed",
  "ruled-raised": "ruled-raised",
  "ruled-spaced": "ruled-spaced",
  "ruled-tall": "ruled-tall",
};

// 🚨 Errors

/**
 * Thrown when a modifier reaches the `negative` family that its own
 * `COMPATIBLE_MODIFIERS` entry does not name.
 *
 * `MeanderGenerationService.validateModifier` rejects such a modifier before
 * any motif service sees it, so nothing reaches this through `generate`. It
 * exists so that {@link NegativeSourceService.source} dispatches on the
 * names it knows and refuses everything else, rather than treating an
 * unrecognized modifier as "no modifier" and quietly drawing the default
 * source — a bug that would read as the family ignoring a flag.
 */
export class UnknownNegativeSourceError extends Error {
  constructor(modifierName: string) {
    super(
      `modifier "${modifierName}" selects no negative source; the negative family draws from ${Object.keys(
        NEGATIVE_SOURCES_BY_MODIFIER_NAME,
      ).join(", ")}, or no modifier at all`,
    );
    this.name = "UnknownNegativeSourceError";
  }
}
