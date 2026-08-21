// ♟️ Constants

/**
 * Section heading a project's rendered statistics sit under.
 *
 * Rendered rather than written into each README by hand: it is inside the
 * markers, so every run rewrites the heading along with the figures beneath it
 * and the twenty-odd documents carrying this block cannot drift apart. Written
 * by hand it would be twenty-odd headings maintained one at a time, which is
 * the state the block exists to replace.
 *
 * A run measuring a whole repository renders no heading of its own. That
 * README is a document a human wrote the rest of, and titles the section it
 * splices into above the markers.
 */
export const PROJECT_SECTION_HEADING = "## ⏲️ Codometer";

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
