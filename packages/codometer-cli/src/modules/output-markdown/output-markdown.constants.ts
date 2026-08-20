// ♟️ Constants

/**
 * Characters that carry meaning inside a regular expression.
 *
 * The block markers are configurable, so they reach the matcher as arbitrary
 * text and have to be escaped before they can be searched for.
 */
export const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * The newlines a file already ends with, however many there are.
 *
 * Stripped before the block is appended, so the separator between the existing
 * document and the block is exactly one blank line whether the file ended with
 * a newline, several, or none.
 */
export const TRAILING_NEWLINES = /\n+$/;
