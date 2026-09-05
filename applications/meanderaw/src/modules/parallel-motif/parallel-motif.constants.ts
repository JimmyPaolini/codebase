// ♟️ Constants

/**
 * How many lattice columns one strand of a bundle adds to a repeat unit.
 *
 * A strand is a bracket: two vertical arms with a crossbar between them, so
 * it occupies one lattice column on each side of the bundle it belongs to. A
 * bundle of `strands` strands therefore spans `2 × strands` lattice columns,
 * and that is the whole of this family's repeat pitch.
 */
export const COLUMNS_PER_STRAND = 2;

/**
 * How many strands a `parallel` drawing carries when no `plied` modifier
 * names a count.
 *
 * Two, because that is the least a family named for strands running
 * alongside one another can mean. A one-strand drawing would be a single
 * bracket per unit with nothing beside it, which is a shape the six original
 * families already have several of.
 */
export const DEFAULT_PARALLEL_STRANDS = 2;

// 🚨 Errors

/** Thrown when a modifier reaches this family that it draws no ply for; `MeanderGenerationService.generate` rejects those first, so nothing reaches it through the seam. */
export class UnknownParallelModifierError extends Error {
  constructor(modifierName: string) {
    super(`modifier "${modifierName}" names no parallel ply`);
    this.name = "UnknownParallelModifierError";
  }
}

/**
 * How many lattice columns one `serpentine` repeat unit spans: one full
 * period of the wave, which is a column that turns at the bottom and a
 * column that turns at the top.
 *
 * It does not scale with the ply, and that is the difference between this
 * shape and the bracket bundles beside it. A `plied` unit is
 * `COLUMNS_PER_STRAND × strands` columns wide because its strands nest
 * across the band; a serpentine's strands stack down it, so a deeper ply
 * divides the same height into more ribbons and leaves the pitch alone.
 */
export const COLUMNS_PER_SERPENTINE_UNIT = 2;

/**
 * Every modifier name this family draws a ply for.
 *
 * All three carry a `strands` count and differ only in what those strands
 * trace: `plied` nests brackets that flip with every repeat unit, `aligned`
 * nests the same brackets without flipping them, and `serpentine` stacks
 * continuous square-wave ribbons down the band instead of nesting brackets
 * across it. `COMPATIBLE_MODIFIERS.parallel` lists the same three, and
 * `parallel-motif.service.unit.test.ts` asserts the two agree — a name in
 * one and not the other is either a modifier the seam admits and this family
 * refuses, or one this family draws and nothing can ask it for.
 */
export const PARALLEL_MODIFIER_NAMES: readonly string[] = [
  "aligned",
  "plied",
  "serpentine",
];
