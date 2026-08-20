// ♟️ Constants

/**
 * Metric path holding how many files a target's globs claimed.
 *
 * Present for every target whatever analyses it ran, because the count is the
 * match itself rather than anything an analysis reported.
 */
export const FILES_METRIC_PATH = "files";

/**
 * Prefix every configured counter's metric path carries.
 *
 * Keeps a counter labelled `files` from answering to the same path the file
 * count does, which is a collision the label alone would have caused.
 */
export const CUSTOM_METRIC_PREFIX = "custom";

/** Separator between the parts of a metric's dotted path. */
export const METRIC_PATH_SEPARATOR = ".";

/**
 * Metric path holding the bytes size analysis measured.
 *
 * The whole of what a size analysis reports: which compression produced the
 * bytes is context for reading the number, not a second number to gate.
 */
export const SIZE_METRIC_PATH = "size";
