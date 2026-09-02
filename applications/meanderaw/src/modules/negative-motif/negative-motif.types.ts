// cspell:ignore dvvxxd dvvxxvvxxvvxxd hxxhhx hxxhhxxhhxxhhx dldldld — mosaic
// tile identifiers, one letter per cell of the tile, from
// MOSAIC_MARK_LETTERS in src/modules/mosaic-motif/mosaic-motif.constants.ts.

// 🏷️ Types

/** One cell of the source pattern, by the lattice column it sits in and the interior level it sits on. */
export interface NegativeCell {
  readonly column: number;
  readonly level: number;
}

/**
 * The modifier names the `negative` family draws a source for.
 *
 * It is deliberately narrower than `Modifier["name"]`: this family knows its
 * own two modifiers and nothing about anybody else's, so a family added later
 * with a modifier of its own forces no edit here. What keeps it honest is
 * `negative-source.service.unit.test.ts`, which asserts these are exactly the
 * names `COMPATIBLE_MODIFIERS.negative` lists.
 */
export type NegativeModifierName = "brick" | "ruled";

/** Which way a source mark runs, and therefore which pair of neighboring cells it walls apart. */
export type NegativeOrientation = "horizontal" | "vertical";

/**
 * One lattice row of a `negative` drawing, and the run of lattice columns
 * one repeat unit draws corridors along it. Grouped into an object rather
 * than passed alongside the tile so the method stays inside the workspace's
 * parameter limit.
 */
export interface NegativeRowSpan {
  readonly from: number;
  readonly row: number;
  readonly to: number;
}

/**
 * Which shortlisted `mosaic` pattern a `negative` drawing inverts. All three
 * come from the negative-space survey's shortlist in `README.md` — they are
 * not chosen here — and all three are _branches only_: their negatives
 * branch at every swept row count and cross at none.
 *
 * - `stair` is `dvvxxd` → `dvvxxvvxxvvxxd`: two dots capping a staircase of
 *   vertical dashes. The shortlist's first entry and the highest-branching
 *   non-crossing pattern it found, so it is what `negative` draws with no
 *   modifier.
 * - `brick` is `hxxhhx` → `hxxhhxxhhxxhhx`: horizontal dashes in running
 *   bond, the shortlist's structurally simplest entry.
 * - `ruled` is `dld` → `dldldld`: one column alternating dot levels with the
 *   continuous rule, the shortlist's columns-1 entry.
 */
export type NegativeSource = "brick" | "ruled" | "stair";

/** One inclusive run along a single lattice line, in lattice indices. */
export interface NegativeSpan {
  readonly from: number;
  readonly to: number;
}
