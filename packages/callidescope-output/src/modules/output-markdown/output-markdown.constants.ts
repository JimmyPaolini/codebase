// ♟️ Constants

/**
 * The start marker of any anchored block this convention recognizes, not
 * just the one a given destination owns.
 *
 * Used to find where a corrupted block — a start marker with no matching
 * end — has to stop being replaced: at another block's own territory,
 * never past it.
 */
export const FOREIGN_ANCHOR_PATTERN = /<!--\s*[A-Z0-9_]+_START\s*-->/;
