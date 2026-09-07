// ♟️ Constants

import type { Modifier } from "../meander-generation/meander-generation.types";

/**
 * Ply-carrying modifier names whose one-strand drawing duplicates
 * `aligned-strands-1` once both border rules are drawn full.
 *
 * At one strand there is nothing to ply and nothing to serpentine: both
 * shapes decompose to the same lone bracket `aligned` already draws at that
 * count. The three shapes still emit different `M`/`V`/`H` runs for it — the
 * duplication is in the *ink* the lattice carries, not in the bytes on disk
 * — so `aligned-strands-1` is the only honest name for it and the sweep
 * drops the strand count named here for `plied` and `serpentine` while
 * keeping it for `aligned`.
 */
export const NAMES_WITHOUT_A_ONE_STRAND_DRAWING: ReadonlySet<Modifier["name"]> =
  new Set(["plied", "serpentine"]);

/**

 * `isLeftward` values swept for the `rung` modifier's batch combinations.
 *
 * Both of them, which is the modifier's whole domain rather than a sample of
 * it. `false` leads,
 * so the rightward drawing the sweep committed under the bare name before
 * the flag existed is still the first one enumerated at each row count.
 *
 * The two are mirror images and every topology count is identical across
 * them, so this pair adds no new measurement to the charter. It is swept
 * anyway because the corpus is what the index page shows, and a direction
 * nobody can see drawn is a direction nobody will use.
 */
export const RUNG_SWEEP_LEFTWARD_VALUES: readonly boolean[] = [false, true];

/**
 * `branches` values swept for the `stagger` modifier's batch combinations.
 *
 * A contiguous run rather than the sampled ply counts `plied`
 * takes, because this parameter has a floor it does not and every value
 * above it draws a visibly different crenel. The first is
 * `MINIMUM_STAGGER_BRANCHES` itself, the narrowest crenel the mode can
 * still tell apart from a plain `comb`; each one after it widens the
 * crenel by a single lattice column, so no value in the run repeats the
 * one before it at another scale.
 *
 * It stops at six because a crenel keeps its shape and only its wavelength
 * grows: past six branches one rail run spans most of a six-repeat band and
 * the figure reads as a `comb` with a couple of changes of side rather than
 * as a crenellation. Nothing structural stops a wider one — the command
 * line accepts up to `MAXIMUM_VALUE` — so this is where the sweep stops
 * rather than where the mode does.
 */
export const STAGGER_SWEEP_BRANCH_COUNTS: readonly number[] = [4, 5, 6];

/**
 * The gallery page `DrawCommand` writes
 at the root of the output directory,
 * listing every document the sweep produced under the directory it landed
 * in. One page rather than one per row count: the tiles are now separated by
 * directory on disk, so the page's only remaining job is to show them all in
 * one place.
 *
 * It links each drawing rather than inlining it, which is what lets a single
 * page carry the whole corpus without duplicating a byte of it — and it sits
 * inside the tree it indexes rather than beside it, so every one of those
 * links is a path down from the page's own directory and the pair moves as a
 * unit.
 */
export const INDEX_FILE_NAME = "index.html";

/**
 * How many columns the `negative` permutation half's source tiles span.
 *
 * One, and it is a definition rather than a budget. A one-column source has
 * no vertical mark for a second column to stagger against, so its negative
 * is rules broken only where the source opens a window — which is what the
 * `ruled` name means, and what makes this half that domain enumerated rather
 * than sampled. The two-column space is a different shape of pattern, not a
 * deeper cut of this one, and the three members of it this repository draws
 * are named in the sweep's other half.
 */
export const NEGATIVE_PERMUTATION_COLUMNS = 1;

/**
 * Subdirectory of a row count's own directory that the `negative`
 * permutations are written under, one column-span directory deep. They are
 * nested rather than left beside that family's named sweep because the two
 * halves are different things: the named half draws ten sources built by
 * rule, and this half inverts every `mosaic` tile it can.
 *
 * `mosaic` used to nest its own enumerated half here too and no longer does.
 * The level separated an enumerated half from a named one, and for that
 * family the separation stopped meaning anything: its named drawings are
 * tiles as well, at column spans the edge budget refuses rather than at some
 * other kind of thing.
 */
export const PERMUTATIONS_SUBDIRECTORY = "permutations";

/**
 * Matches the directory segment an enumerated tile is filed under, which is
 * the column span of its shape.
 *
 * It is how a committed document is told to be an enumerated one rather than
 * a named one, now that only `negative` puts its enumerated half under a
 * `permutations/` level. Every enumerated document of either family is
 * filed under a column span, and no named one is.
 */
export const COLUMN_SPAN_PATTERN = /\/\d+-columns\//u;

/** `repeatCount` every swept mosaic is drawn at, wide enough to read the tile's rhythm without dominating the index page. */
export const PERMUTATION_REPEAT_COUNT = 6;

// 🚨 Errors

/**
 * Thrown when two combinations in the sweep would write the same path.
 *
 * The sweep is a cross product, so a naming convention that stopped
 * distinguishing two of its points would silently drop one drawing rather
 * than fail. This is what makes that a failure.
 */
export class CollidingPathsError extends Error {
  constructor() {
    super("Sweep produced colliding output paths");
    this.name = "CollidingPathsError";
  }
}

/**
 * Thrown when only one of `--type` and `--rows` is given.
 *
 * Neither flag can be `required`, because passing neither is how the whole
 * sweep is asked for — so the pair has to be checked rather than declared.
 */
export class IncompleteDrawingError extends Error {
  constructor() {
    super(
      "drawing one meander needs both --type and --rows; pass neither to sweep every meander instead",
    );
    this.name = "IncompleteDrawingError";
  }
}

/** Thrown when a modifier that carries a parameter is asked for without it. */
export class MissingModifierParameterError extends Error {
  constructor(modifierName: string, flag: string) {
    super(`Modifier "${modifierName}" requires ${flag}`);
    this.name = "MissingModifierParameterError";
  }
}

/** Thrown when an option's value falls outside the set that option accepts. */
export class UnsupportedOptionError extends Error {
  constructor(option: string, value: string, supported: readonly string[]) {
    super(
      `Unsupported ${option} "${value}"; supported: ${supported.join(", ")}`,
    );
    this.name = "UnsupportedOptionError";
  }
}
