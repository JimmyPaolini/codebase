// ♟️ Constants

import type {
  BranchMode,
  BranchModifierName,
  RungDirection,
  RungOrientation,
} from "./branch-motif.types";

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
 * {@link BranchMotifService.unitColumns}. At **three** branches that
 * expression evaluates to this number — the width the mode drew for as long
 * as it could not be asked for anything else — and that coincidence is what
 * {@link MINIMUM_STAGGER_BRANCHES} was set from. Its floor of four draws a
 * three-column unit, one wider than this and the narrowest the mode
 * commits.
 */
export const BRANCH_UNIT_COLUMNS = 2;

/**
 * Which mode a `branch` drawn with no modifier inks: the plainest of the
 * three, a rail with a tooth per column, hanging down from the band's top
 * row. It is named here rather than written inline so the default is a
 * stated choice rather than whichever branch a dispatch happened to fall
 * through to.
 *
 * No modifier selects this mode: `rung` and `stagger` are the family's only
 * two, so a bare `--type branch` is the one way to ink it.
 */
export const DEFAULT_BRANCH_MODE: BranchMode = "comb";

/**
 * Which of the four directions a `rung` drawn with no `--direction` faces:
 * `northeast`, the rail along the band's north border and the rungs
 * reaching east, which is the only drawing the mode made before the other
 * three were reachable and so the one every `rung` committed under the bare
 * name was.
 *
 * A named value can be told absent where the boolean this replaced could
 * not, so `rung` could refuse an unstated direction the way `stagger`
 * refuses an unstated branch count. It defaults instead, because a
 * direction that was never asked for used to be drawn and renaming every
 * one of those files buys nothing.
 */
export const DEFAULT_RUNG_DIRECTION: RungDirection = "northeast";

/**
 * The fewest branches one `stagger` rail run may join before changing side.
 *
 * Four, and it is now a **retained** bound rather than a derived one. It was
 * set while every rail ran along a border row and both borders were ruled
 * end to end: `BranchMotifService.unitColumns` answers `branches - 1`, which
 * at three branches is exactly `BRANCH_UNIT_COLUMNS` — the width `comb`
 * already draws — and a three-branch rail run then sat wholly inside a rule
 * already there, contributing nothing the rule did not draw. The
 * crenellation the parameter names was absent from the ink and what was
 * left was a plain comb: another mode's drawing under this mode's name, a
 * parameter advertising a choice it could not make.
 *
 * A `stagger` rail now runs one lattice row clear of both rules — see
 * `BranchMotifService.figureRows` — so no rule swallows it and the
 * three-branch figure is a drawing of its own, differing from the comb of
 * the same width in components, edges, free ends, and forks alike. What
 * survives of the original argument is only the unit-width coincidence,
 * which is a fact about widths rather than a degeneracy.
 * `branch-motif.service.unit.test.ts` renders the three-branch figure this
 * constant excludes and measures it as distinct, so the number and what is
 * left of its reason cannot drift apart. Lowering it to three is a decision
 * about which drawings the corpus commits, and nothing here forces it
 * either way.
 */
export const MINIMUM_STAGGER_BRANCHES = 4;

/**
 * Which border each {@link RungDirection} rails along and which way its
 * rungs reach, as the pair of booleans the drawing methods actually read.
 *
 * A `Record` over the union rather than two comparisons per axis, for the
 * same reason {@link BRANCH_MODES_BY_MODIFIER_NAME} is one: a direction
 * added to the union and forgotten here is a type error, where a
 * `direction === "southwest" || …` chain would silently draw it north-east.
 * The compass name is the whole of the mapping — `south*` rails south,
 * `*west` reaches west — so nothing here is a decision, only the place that
 * reading is written down once.
 */
export const RUNG_ORIENTATIONS_BY_DIRECTION: Record<
  RungDirection,
  RungOrientation
> = {
  northeast: { isSouthRailed: false, reachesWest: false },
  northwest: { isSouthRailed: false, reachesWest: true },
  southeast: { isSouthRailed: true, reachesWest: false },
  southwest: { isSouthRailed: true, reachesWest: true },
};

/**
 * Every direction the `rung` modifier accepts: all four, which is the
 * modifier's whole domain rather than a sample of it.
 *
 * One constant serves both halves of that. `DrawParametersService` narrows
 * `--direction` against it and refuses anything outside, the way it already
 * refuses a `--flip` outside `SUPPORTED_SERPENTINE_FLIPS`; and
 * `DrawCombinationsService` enumerates it, so every direction the command
 * line accepts is one the sweep commits and the charter gates. A direction
 * reachable from the command line and absent from `output/` is a direction
 * nobody can see drawn.
 *
 * {@link DEFAULT_RUNG_DIRECTION} leads, so the drawing the sweep committed
 * under the bare name before the other three existed is still the first one
 * enumerated at each row count.
 */
export const SUPPORTED_RUNG_DIRECTIONS: readonly RungDirection[] = [
  "northeast",
  "northwest",
  "southeast",
  "southwest",
];

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
