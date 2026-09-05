// ♟️ Constants

import type { BranchMode, BranchModifierName } from "./branch-motif.types";

/**
 * Which mode each of this family's modifiers selects.
 *
 * `Record<BranchModifierName, …>` is what makes the dispatch total: a
 * modifier this family declares compatible and forgets to map is a type
 * error, so {@link BranchMotifService.mode} has no branch left to fall
 * through. Anything outside this map is refused with
 * {@link UnknownBranchModeError} rather than quietly answered with
 * {@link DEFAULT_BRANCH_MODE}.
 */
export const BRANCH_MODES_BY_MODIFIER_NAME: Record<
  BranchModifierName,
  BranchMode
> = {
  rung: "rung",
  stagger: "stagger",
};

/**
 * How many lattice columns one `comb` or `rung` repeat unit spans.
 *
 * Two is the smallest width at which `rung` reads as a repeat rather than
 * as a solid field: the unit's first column carries the stile and its
 * second carries the free ends of the rungs, so a one-column unit would put
 * a stile in every column and leave no rung anywhere. `comb` would work at
 * any width and is drawn at this one because nothing asks it to be drawn at
 * another — every column carries the same full tooth, so its unit width is
 * a tiling convenience rather than a shape.
 *
 * `stagger` is the mode this number no longer decides. Its crenel is as
 * wide as the run of branches the rail joins before changing side, so its
 * unit width is `branches - 1` and is read off the modifier by
 * {@link BranchMotifService.unitColumns}. At
 * {@link MINIMUM_STAGGER_BRANCHES} that expression evaluates to this
 * number, which is why the mode drew a two-column unit for as long as it
 * could not be asked for anything else.
 */
export const BRANCH_UNIT_COLUMNS = 2;

/**
 * Which mode a `branch` drawn with no modifier inks: the plainest of the
 * three, a rail with a tooth per column. It is named here rather than
 * written inline so the default is a stated choice rather than whichever
 * branch a dispatch happened to fall through to.
 */
export const DEFAULT_BRANCH_MODE: BranchMode = "comb";

/**
 * Which direction a `rung` drawn with no `--leftward` points its rungs:
 * rightward, which is the only direction the mode had before the flag
 * existed and so the one every drawing committed under the bare name was.
 *
 * It is a stated default rather than an absent one because the flag is a
 * boolean: commander cannot tell "not passed" from "passed false", so the
 * mode has no way to refuse an unstated direction the way `stagger` refuses
 * an unstated branch count. Naming the fallback here is what keeps the two
 * halves of that asymmetry visible in one place.
 */
export const DEFAULT_RUNG_IS_LEFTWARD = false;

/**
 * The fewest branches one `stagger` rail run may join before changing side.
 *
 * Three, and it is a structural floor rather than a taste one. A run
 * spanning `branches` teeth forks at the teeth strictly inside it, so a
 * two-branch run — a rail crossing a single lattice step from one tooth to
 * the next — has no interior tooth and forks nowhere. The whole figure
 * would then be a `nodes - 1` edge graph of maximum degree two: a simple
 * path, still a tree and still space-filling, but with zero T-junctions.
 *
 * That is not a stricter drawing, it is a different family. `branch`
 * declares invariant 3 relaxed in *every* mode, and the charter property
 * test asserts a declared relaxation is present rather than merely
 * permitted — so a branching family that stopped branching would fail its
 * own charter rather than draw something new.
 * `branch-motif.service.unit.test.ts` renders the two-branch figure this
 * constant excludes and measures every claim in the paragraph above, so the
 * number and its reason cannot drift apart.
 */
export const MINIMUM_STAGGER_BRANCHES = 3;

// 🚨 Errors

/**
 * Thrown when a modifier reaches the `branch` family that its own
 * `COMPATIBLE_MODIFIERS` entry does not name.
 *
 * `MeanderGenerationService.validateModifier` rejects such a modifier
 * before any motif service sees it, so nothing reaches this through
 * `generate`. It exists so that {@link BranchMotifService.mode} dispatches
 * on the two names it knows and refuses everything else, rather than
 * treating an unrecognized modifier as "no modifier" and quietly drawing
 * the default mode — a bug that would read as the family ignoring a flag.
 */
export class UnknownBranchModeError extends Error {
  constructor(modifierName: string) {
    super(
      `modifier "${modifierName}" selects no branch mode; the branch family inks "rung", "stagger", or no modifier at all`,
    );
    this.name = "UnknownBranchModeError";
  }
}
