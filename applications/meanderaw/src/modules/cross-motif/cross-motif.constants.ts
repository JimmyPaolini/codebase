// ♟️ Constants

/**
 * How many lattice columns one `cross` repeat unit spans, and therefore how
 * many bars it draws: two, linked at the top by their own connector and to
 * the next unit's first bar at the bottom, so the warp reads as one
 * continuous crenellated fillet running the length of the band.
 *
 * It cannot be widened while the family keeps a bar in every interior column,
 * which is what makes it space-filling: a connector spanning two columns
 * would pass through the bar between them at that bar's own end, and three
 * arms of ink would meet there — the T-junction invariant 3 forbids. Two
 * columns is therefore the shortest period that can alternate top and bottom
 * links, and the only one available.
 *
 * Whether some *other* crossing family could space-fill without a bar in
 * every column is a separate question, and an open one: see
 * `docs/adr/0004-draw-crossings-as-a-one-pitch-interlace-break.md`, which
 * records a search that found none and is careful not to call it a proof.
 */
export const CROSS_UNIT_COLUMNS = 2;
