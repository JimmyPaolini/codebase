// ♟️ Constants

/**
 * Which repeat unit of a drawing is the one addressed.
 *
 * Never the first and never the last, because both of those carry the band's
 * own termination rather than its pattern: a family that clips its final
 * unit flush with its own motif, or that opens with an overhang, would put
 * that accident into the address and give two drawings of one pattern two
 * names. The second unit is the shallowest one that is neither, which is why
 * {@link MINIMUM_ADDRESSABLE_UNITS} is one more than it.
 */
export const ADDRESSED_UNIT = 1;

/** How many repeat units a drawing must hold for {@link ADDRESSED_UNIT} to be neither its first nor its last. */
export const MINIMUM_ADDRESSABLE_UNITS = ADDRESSED_UNIT + 2;

// 🚨 Errors

/**
 * Thrown when a document cannot be addressed at the span it was given: a
 * span that is not a whole number of columns, or a drawing too narrow to
 * hold an interior repeat unit at it.
 *
 * It is deliberately narrow. A document that cannot be *read* is refused by
 * `MeanderLatticeService` — a curve, a diagonal, a second stroke width, a
 * coordinate off the grid — and those refusals travel out of here untouched
 * rather than being caught and renamed, so a drawing nobody should trust is
 * never handed an address instead.
 */
export class InvalidSpanError extends Error {
  constructor(columns: number, reason: string) {
    super(`a span of ${columns} cannot address this document: ${reason}`);
    this.name = "InvalidSpanError";
  }
}
