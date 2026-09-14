// ♟️ Constants

/**
 * The shallowest band worth enumerating, and the one number this sweep adds
 * to the edge budget it otherwise inherits whole.
 *
 * Three, for the reason `MOSAIC_TILE_MINIMUM_ROWS` is three: a two-row band's
 * interior is a single level with nothing under it, so no southward edge
 * exists anywhere in it and the whole space is the horizontal necklaces. Not
 * one family's defining combination is about a repeat like that — every rule
 * `MeanderClassificationService` states either counts a junction, a loop, or
 * a piece, and a band with no vertical ink can close nothing and fork
 * nowhere — so a sweep that included two rows would be spending its widest
 * shape on the corner of the space no family lives in. The budget alone
 * admits sixteen columns there, which is 2 ** 16 assignments folded through
 * a symmetry group of 64 elements, and the largest single cost in the sweep
 * by some distance.
 *
 * There is deliberately no maximum here to match it. The budget decides the
 * deepest band, which is nine rows at one column — see
 * `MeanderEnumerationService.shapes` — and a second number saying so would
 * be a number that could disagree with it.
 */
export const MEANDER_ENUMERATION_MINIMUM_ROWS = 3;
