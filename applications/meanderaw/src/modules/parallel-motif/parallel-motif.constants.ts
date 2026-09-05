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
