// 🏷️ Types

/**
 * Which spanning tree of the band's lattice a `branch` drawing inks.
 *
 * Every mode paints the same lattice points — that is invariant 2 — and
 * every mode joins them with exactly one fewer step than there are points,
 * which is what makes each a tree rather than a figure with loops. They
 * differ only in *which* steps they keep.
 *
 * - `comb` runs a rail along the band's top lattice row and hangs a full
 *   tooth from every lattice column.
 * - `stagger` keeps the same teeth and moves the rail: it runs along the
 *   top for one repeat unit and along the bottom for the next, so the
 *   figure reads as a crenellation rather than a fringe. Its modifier
 *   carries the run's own width — how many branches one rail joins before
 *   it changes side — so the crenel is a parameter rather than a constant.
 * - `rung` turns the construction on its side: one vertical stile per
 *   repeat unit, a horizontal rung off it at every lattice row, and a rail
 *   along the top joining each unit to the next. Its modifier carries which
 *   way the rungs point, which mirrors the whole figure rather than
 *   changing it.
 */
export type BranchMode = "comb" | "rung" | "stagger";

/**
 * The modifier names the `branch` family draws a mode for.
 *
 * It is deliberately narrower than `Modifier["name"]`: this family knows
 * its own two modifiers and nothing about anybody else's, so a family added
 * later with a modifier of its own forces no edit here. What keeps it
 * honest is `branch-motif.service.unit.test.ts`, which asserts these are
 * exactly the names `COMPATIBLE_MODIFIERS.branch` lists.
 */
export type BranchModifierName = "rung" | "stagger";

/** One inclusive run along a single lattice line, in lattice indices. */
export interface BranchSpan {
  readonly from: number;
  readonly to: number;
}

/**
 * Where one repeat unit sits in the drawing, how wide it is, and how tall
 * the band is. Grouped into an object rather than passed alongside the mode
 * so the drawing methods stay inside the workspace's parameter limit.
 *
 * `unitColumns` is here rather than read from a constant because `stagger`
 * sets it from its own `branches` — see
 * {@link BranchMotifService.unitColumns}. Every unit of one drawing carries
 * the same width, so `firstColumn` is always `unitColumns * unitIndex`.
 */
export interface BranchUnitPlacement {
  readonly firstColumn: number;
  readonly isLastUnit: boolean;
  readonly rows: number;
  readonly unitColumns: number;
  readonly unitIndex: number;
}
