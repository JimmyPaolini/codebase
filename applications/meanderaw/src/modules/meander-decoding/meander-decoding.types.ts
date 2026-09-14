// 🏷️ Types

/**
 * The four direction bits one lattice point's Code digit carries — the same
 * `8`/`4`/`2`/`1` north/south/east/west encoding
 * `LatticeIdentificationService.identify` already spells a filename in, read
 * back here rather than restated under a new name.
 *
 * A fresh type rather than a reuse of `MosaicDirections`: this decoder
 * answers to no family, `mosaic` included, and a type named after one would
 * say otherwise.
 */
export interface MeanderPointDirections {
  readonly east: boolean;
  readonly north: boolean;
  readonly south: boolean;
  readonly west: boolean;
}

/**
 * One decoded Code: a grid of direction bits, one entry per interior
 * lattice point, indexed `[level][column]` in reading order — top to
 * bottom, left to right — the same order `MeanderDecodingService.decode`
 * reads a Code's own characters in.
 */
export type MeanderPointGrid = readonly (readonly MeanderPointDirections[])[];
