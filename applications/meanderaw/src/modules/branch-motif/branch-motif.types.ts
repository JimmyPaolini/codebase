// 🏷️ Types

/**
 * Which spine-and-teeth figure over the band's lattice a `branch` drawing
 * inks.
 *
 * Every mode paints the same lattice points — that is invariant 2 — and
 * every mode forks. None closes a loop: each mode's figure is inset by a
 * lattice row from every rule beside it, so the rules are pieces of their
 * own and the whole drawing is a forest. They differ in *which* steps they
 * keep, and in how many rules that leaves to draw — see
 * `BranchMotifService.figureRows` and `BranchMotifService.border`.
 *
 * - `comb` runs a rail along the band's top border row and reaches a tooth
 *   from it down into every lattice column, stopping one row short of the
 *   single rule along the bottom. It has no modifier of its own — it is
 *   what a bare `--type branch` inks.
 * - `stagger` keeps the same teeth, insets them from the top border as
 *   well, and moves the rail between their two ends: along the upper for
 *   one repeat unit and along the lower for the next, so the figure reads
 *   as a crenellation rather than a fringe. Both borders are ruled, one row
 *   clear of it either way, which is what keeps that crenellation visible.
 *   Its modifier carries the run's own width — how many branches one rail
 *   joins before it changes side — so the crenel is a parameter rather than
 *   a constant. Needing two free rows between the rules is also what sets
 *   the family's structural minimum.
 * - `rung` turns the construction on its side: one vertical stile per
 *   repeat unit, a horizontal rung off it at every row the stile spans, and
 *   a rail along one border joining each unit to the next. Its modifier
 *   carries a {@link RungDirection}, which reflects the whole figure rather
 *   than changing it.
 */
export type BranchMode = "comb" | "rung" | "stagger";

/**
 * The modifier names the `branch` family draws a mode for.
 *
 * It is deliberately narrower than `Modifier["name"]`: this family knows
 * its own two modifiers and nothing about anybody else's, so a family
 * added later with a modifier of its own forces no edit here. What keeps it
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

/**
 * Which way one `rung` drawing is turned, as a compass direction naming
 * both of the axes the figure has.
 *
 * The name's first half is **the border the rail runs along**, and its
 * second is **the direction the rungs face** — where a rung's free end
 * travels, which is the way the stile is not. So a reader who knows where
 * the rail is knows which way the rungs point without a table, and the two
 * halves are independent: each of the four combinations is a drawing.
 *
 * `northeast` and `northwest` rail along row 0 and are ruled at row `rows`;
 * `southeast` and `southwest` are those two turned over, railed along row
 * `rows` and ruled at row 0. `northeast` and `southeast` stand their stiles
 * on the unit's first lattice column so the rungs reach east; `northwest`
 * and `southwest` stand them on the unit's last so the rungs reach west.
 * See {@link RungOrientation}, which is where those two axes are read off
 * the name, and `BranchMotifService.rungRows`.
 *
 * The four measure identically — a reflection moves ink without adding or
 * removing any — so this is one mode in four orientations rather than four
 * modes. `branch-motif.service.unit.test.ts` asserts both halves of that:
 * the four are pairwise distinct drawings, and every count the family is
 * measured by comes out the same for all four.
 */
export type RungDirection =
  | "northeast"
  | "northwest"
  | "southeast"
  | "southwest";

/**
 * The two independent choices one {@link RungDirection} names, so the
 * drawing methods read a border and a side rather than re-deriving them from
 * the compass name.
 *
 * Both are booleans against the northern, eastward drawing `rung` inked
 * before the other three were reachable: that one is
 * `{ isSouthRailed: false, reachesWest: false }`, and it is what
 * `DEFAULT_RUNG_DIRECTION` names. `RUNG_ORIENTATIONS_BY_DIRECTION` maps
 * every direction to its pair, and being a `Record` over the union is what
 * makes a direction added later a type error rather than a silent
 * north-eastward drawing.
 */
export interface RungOrientation {
  readonly isSouthRailed: boolean;
  readonly reachesWest: boolean;
}
