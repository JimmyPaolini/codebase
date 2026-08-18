// ♟️ Constants

/** The tag that marks a callable as on its way out. */
export const DEPRECATED_TAG = "deprecated";

/**
 * Characters of documentation prose a frame keeps.
 *
 * A summary is meant to orient a reader mid-stack, not to replace opening the
 * file, and a paragraph indented under ten frames is worse than a sentence.
 */
export const SUMMARY_LIMIT = 120;

/** Appended to a summary the limit cuts short. */
export const TRUNCATION_SUFFIX = "…";
