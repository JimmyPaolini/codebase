// ♟️ Constants

/** Marks the first frame of a printed call stack. */
export const ENTRY_FRAME_PREFIX = "🚀";

/** Marks every frame below the first. */
export const NESTED_FRAME_PREFIX = "└─>";

/**
 * Characters of signature a frame prints before it collapses the parameters.
 *
 * Most signatures here are short — the median is under twenty characters — but
 * a NestJS constructor taking a dozen injected services runs past four hundred,
 * and one of those inside an indented stack destroys the shape that makes the
 * stack readable at all.
 */
export const SIGNATURE_LIMIT = 80;

/** Stands in for a parameter list too long to print. */
export const COLLAPSED_PARAMETERS = "(…)";

/** Marks a frame whose callable is on its way out. */
export const DEPRECATED_MARKER = "⚠ deprecated";

/** Introduces the documentation line printed under a frame. */
export const SUMMARY_PREFIX = "↳";

/** Heading a whole-run report is written under. */
export const RUN_HEADING = "# 🔭 Callidescope";

/** Header of the run or project summary table. */
export const MARKDOWN_SUMMARY_HEADER = "| Measure | Value |\n| --- | --- |";

/** Header of the module-spread table. */
export const MARKDOWN_SPREAD_HEADER =
  "| Callable | Spread | Calls directly | Location |\n| --- | --- | --- | --- |";

/** Header of the misplaced-callable table. */
export const MARKDOWN_MISPLACED_HEADER =
  "| Callable | Declared in | Called from | Callers |\n| --- | --- | --- | --- |";
