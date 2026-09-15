// 🏷️ Types

/**
 * One Code with the shape it is read at, which is the whole of what a
 * meander is.
 *
 * A Code is one hexadecimal character per interior lattice point, in reading
 * order — top to bottom, left to right — so the character for the point at
 * `(level, column)` sits at `level * columns + column` and nothing more than
 * that index is needed to read it. {@link CodeService.directionsAt} is that
 * arithmetic written once.
 *
 * It replaces a decoded grid of direction bits, `readonly (readonly …[])[]`,
 * that every consumer built in order to walk. The array of arrays gave
 * nothing the string does not: the same points in the same order, at the
 * cost of allocating one object per lattice point of every one of the 31,244
 * meanders the sweep draws. What survives of it is the four-direction
 * reading a caller gets back for one point, which is where the bit meanings
 * are written down — see `MosaicDirections`.
 *
 * {@link levels} is `rows - 1` and is carried rather than recomputed because
 * it is the bound every walk over a Code runs to: the band's two border
 * rules at grid levels `0` and `rows` are cap ticks rather than points of
 * the repeat, so a `rows`-row meander has `rows - 1` interior levels.
 */
export interface ParsedCode {
  readonly columns: number;
  readonly digits: string;
  readonly levels: number;
  readonly rows: number;
}
