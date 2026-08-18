// ♟️ Constants

/** Width of the rules framing each section of the console report. */
export const RULE_WIDTH = 66;

/** Marks the first frame of a printed call stack. */
export const ENTRY_FRAME_PREFIX = "🚀";

/** Marks every frame below the first. */
export const NESTED_FRAME_PREFIX = "└─>";

/** Stacks the console report prints before it stops. */
export const CONSOLE_STACK_LIMIT = 20;

/** Cohesion findings the console report prints before it stops. */
export const CONSOLE_FINDING_LIMIT = 15;

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
