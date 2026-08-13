// ♟️ Constants

/**
 * Separator joining an instance path and a template path into a deduplication
 * key. A NUL byte cannot occur in either, so it can never collide.
 */
export const FINDING_KEY_SEPARATOR = "\u0000";
