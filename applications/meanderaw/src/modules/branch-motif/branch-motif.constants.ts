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
 * How many lattice columns one `branch` repeat unit spans.
 *
 * Two is the smallest width at which `rung` reads as a repeat rather than
 * as a solid field: the unit's first column carries the stile and its
 * second carries the free ends of the rungs, so a one-column unit would put
 * a stile in every column and leave no rung anywhere. `comb` and `stagger`
 * would work at any width, and `stagger`'s crenel is this wide because of
 * it — the rail changes side once per unit, so a unit's width is the
 * crenel's width.
 */
export const BRANCH_UNIT_COLUMNS = 2;

/**
 * Which mode a `branch` drawn with no modifier inks: the plainest of the
 * three, a rail with a tooth per column. It is named here rather than
 * written inline so the default is a stated choice rather than whichever
 * branch a dispatch happened to fall through to.
 */
export const DEFAULT_BRANCH_MODE: BranchMode = "comb";

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
