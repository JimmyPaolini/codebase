// ♟️ Constants

/**
 * How much of a block's prose a measurement carries to identify it.
 *
 * Long enough that two blocks in one file read differently, short enough that
 * a breach stays one line of markdown.
 */
export const COMMENT_EXCERPT_LENGTH = 48;

/** What a measured comment block is called in a report. */
export const COMMENT_KIND = "comment";

/** What a whole file's comments, measured together, are called in a report. */
export const FILE_COMMENT_KIND = "file comments";

/** What a file-wide measurement carries where a block carries its excerpt. */
export const FILE_COMMENT_DECLARATION = "every comment in the file";

/**
 * A `#` comment's marker, and the space a writer puts after it.
 *
 * Shared by every language whose comments start with `#` — shell, TOML,
 * Python, and YAML — because the marker is the only thing they have in common
 * and it is exactly the same in all four.
 */
export const HASH_COMMENT_MARKER_PATTERN = /^\s*#+\s?/u;
