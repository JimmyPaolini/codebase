// ♟️ Constants

/**
 * The two run modes a `codependix map` command line resolves to.
 *
 * Named as a list rather than only as the `CodependixRunMode` union so a
 * command line naming neither flag can offer them as prompt choices, and the
 * union can be derived from the list rather than restated beside it.
 */
export const CODEPENDIX_RUN_MODES = ["check", "write"] as const;
