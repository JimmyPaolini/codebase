// ♟️ Constants

/** Stands in for a cell a limit left empty, so no cell is ever blank. */
export const ABSENT_LABEL = "—";

/** Column headers of the limits table, in the order they are rendered. */
export const LIMIT_TABLE_COLUMNS = [
  "Project",
  "Limit",
  "Value",
  "Origin",
  "Declared in",
] as const;

/** Heading the listing is written under. */
export const LIMITS_HEADING = "# 🔭 Callidescope Limits";

/** States what the two origins mean, so the table needs no second reading. */
export const LIMITS_SUMMARY =
  "Every project in scope, what it is judged against, and where each number is written. `declared` is the project's own; `inherited` is the workspace default it falls back to.";

/**
 * What a value cell says when nothing anywhere declares the limit.
 *
 * Breadth has no workspace default and no tool default, so a project that
 * declares none is gated by nothing at all. Printing a number here — the
 * workspace's, or an invented one — would say the opposite.
 */
export const NO_LIMIT_LABEL = "none";

/**
 * Names the project rooted at the workspace root itself.
 *
 * Its workspace-relative root is the empty string, which would print as a
 * blank cell — and a blank cell in a listing of what gates what reads as
 * something missing rather than as the directory it is.
 */
export const ROOT_PROJECT_LABEL = ".";

/** Names the row carrying the default every project inherits. */
export const WORKSPACE_LABEL = "workspace";
