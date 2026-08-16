// ♟️ Constants

/**
 * Characters that carry meaning inside a regular expression.
 *
 * The block markers are configurable, so they reach the matcher as arbitrary
 * text and have to be escaped before they can be searched for.
 */
export const REGEX_SPECIAL_CHARACTERS = /[.*+?^${}()|[\]\\]/g;
