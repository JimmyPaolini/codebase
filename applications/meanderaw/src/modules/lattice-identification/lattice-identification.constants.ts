// ♟️ Constants

/**
 * How much of a drawing the addressed window leaves untouched at each end,
 * counted in **pitches** rather than in spans.
 *
 * Both ends carry the band's own termination rather than its pattern: a
 * family that clips its final unit flush with its own motif, or that opens
 * with an overhang, would put that accident into the address and give two
 * drawings of one pattern two names. Those artifacts are one repeat *unit*
 * wide, so one pitch is exactly the margin they need — and a margin of one
 * whole span instead would be needlessly greedy, which matters because a
 * span can be four pitches. `boxes spin` at five rows is drawn 31 lattice
 * columns wide and spans 16 of them; clearing a span at each end would need
 * 48 and make the drawing impossible to address, while clearing a pitch needs 24.
 */
export const TERMINATION_MARGIN_PITCHES = 1;

// 🚨 Errors

/**
 * Thrown when a document cannot be addressed at the unit it was given: a
 * pitch or a span that is not a whole number of columns, a span that is not
 * a whole number of pitches, or a drawing too narrow to hold that span clear
 * of both band terminations.
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
