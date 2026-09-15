// ♟️ Constants

// 🚨 Errors

/**
 * Thrown when a grid of direction bits is not a tile: two adjoining points
 * disagree about the edge between them, a point at the first level claims a
 * `north` or one at the last claims a `south`, or the grid is not the size
 * its own `rows` and `columns` declare.
 *
 * Refusing these is what makes the bits a bijection with the drawing. A
 * disagreeing pair would have to render as a half-unit stub ending between
 * lattice lines, which `LatticeService` refuses to read back, and
 * which no charter invariant admits.
 */
export class MalformedTileError extends Error {
  constructor(reason: string) {
    super(`direction bits do not describe a mosaic tile: ${reason}`);
    this.name = "MalformedTileError";
  }
}
