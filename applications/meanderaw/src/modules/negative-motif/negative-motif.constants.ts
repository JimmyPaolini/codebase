// ♟️ Constants

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
