// ♟️ Constants

/**
 * How many stroke widths one grid pitch spans. This is invariant 2's own
 * arithmetic — the white channel between two parallel strokes equals the
 * stroke width, so a pitch holds exactly one of each — and it is what lets a
 * document be read back onto its lattice from nothing but its `stroke-width`
 * attribute.
 */
export const GRID_PITCH_IN_STROKE_WIDTHS = 2;

/**
 * How far off its lattice line a coordinate may sit before the document is
 * refused, as a fraction of one grid pitch.
 *
 * `GridGeometryService.formatCoordinate` rounds to five decimal places, and
 * at a row count whose grid unit does not divide the canvas evenly (7, 9,
 * 11) that rounding accumulates: the worst case is 0.00023 of a pitch — a
 * hand-derived measurement, taken over the six original families' 3,293
 * documents and not re-taken since. One percent leaves that forty times over
 * while staying fifty times tighter than the half pitch at which a
 * coordinate would round onto the wrong lattice line.
 */
export const LATTICE_TOLERANCE_FRACTION = 0.01;

/** Reads every path's `d` attribute out of a rendered document. The lookaround keeps the whole match to the attribute's own value, and the leading whitespace keeps it off any other attribute ending in `d`. */
export const PATH_DATA_PATTERN = /(?<=\sd=")[^"]*(?=")/gu;

/** Splits path data into its commands and coordinates, one token at a time. */
export const PATH_TOKEN_PATTERN = /[MHV]|-?[\d.]+/gu;

/** Matches the first character of path data that is neither a supported command, a coordinate, nor a separator. */
export const PATH_UNSUPPORTED_CHARACTER_PATTERN = /[^\d\s,.\-MHV]/u;

/** Reads the canvas height. The leading whitespace is what keeps it off `stroke-width`, whose attribute name ends in the same word. */
export const SVG_HEIGHT_PATTERN = /\sheight="([\d.]+)"/u;

/** Reads the canvas width. The leading whitespace is what keeps it off `stroke-width`, whose attribute name ends in the same word. */
export const SVG_WIDTH_PATTERN = /\swidth="([\d.]+)"/u;

/** Every path command the charter's orthogonal-only invariant admits: a move, a horizontal run, and a vertical run. */
export const SUPPORTED_PATH_COMMANDS: readonly string[] = ["H", "M", "V"];

/** Reads the `stroke-width` every path declares. Invariant 6 allows a document only one, so more than one distinct value is refused. */
export const STROKE_WIDTH_PATTERN = /stroke-width="([\d.]+)"/gu;

// 🚨 Errors

/** Thrown when a coordinate or a canvas dimension does not sit on the lattice the document's stroke width implies. */
export class OffLatticeCoordinateError extends Error {
  constructor(value: number, pitch: number) {
    super(
      `coordinate ${value} does not sit on a lattice of pitch ${pitch}; every meander coordinate must`,
    );
    this.name = "OffLatticeCoordinateError";
  }
}

/** Thrown when a document carries no measurable geometry: no dimensions, no stroke width, more than one stroke width, or a command with the wrong number of coordinates. */
export class UnmeasurableDocumentError extends Error {
  constructor(reason: string) {
    super(`document cannot be measured: ${reason}`);
    this.name = "UnmeasurableDocumentError";
  }
}

/** Thrown when path data uses a command other than `M`, `H`, or `V` — charter invariant 1 admits no diagonals and no curves. */
export class UnsupportedPathCommandError extends Error {
  constructor(command: string) {
    super(
      `path command "${command}" is not orthogonal; only M, H, and V are supported`,
    );
    this.name = "UnsupportedPathCommandError";
  }
}
