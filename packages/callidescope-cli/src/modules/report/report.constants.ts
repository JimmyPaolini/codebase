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

/**
 * Characters of documentation prose a printed frame keeps.
 *
 * A summary is meant to orient a reader mid-stack, not to replace opening the
 * file, and a paragraph indented under ten frames is worse than a sentence.
 * Only the tree is bound by this — the JSON report carries the whole comment.
 */
export const SUMMARY_LIMIT = 120;

/**
 * Ends a sentence, when the next one starts.
 *
 * A capital after the space is what separates a sentence break from `e.g. the`
 * or a dotted identifier, neither of which ends anything.
 */
export const SENTENCE_END_PATTERN = /[!.?](?=\s+[A-Z])/;

/** Appended to a summary cut mid-thought. */
export const TRUNCATION_SUFFIX = "…";

/** Marks a frame whose callable is on its way out. */
export const DEPRECATED_MARKER = "⚠ deprecated";

/** Introduces the documentation line printed under a frame. */
export const SUMMARY_PREFIX = "↳";

/** Heading a whole-run report is written under. */
export const RUN_HEADING = "# 🔭 Callidescope";

/**
 * Opens every diagram.
 *
 * Left to right, because that is the direction a stack reads and the direction
 * a wide, shallow call graph fits a page.
 */
export const MERMAID_FLOWCHART_HEADER = "flowchart LR";

/**
 * Callables a diagram draws before it stops accepting stacks.
 *
 * GitHub refuses a mermaid block past 50,000 characters, and at roughly fifty
 * characters per node and edge this leaves room to spare — the widest project
 * here draws 263. Whole stacks are dropped rather than trimmed, so the diagram
 * never shows an edge into a callable it does not draw.
 */
export const MAXIMUM_DIAGRAM_NODES = 300;

/** Prefix of every generated node identifier. */
export const DIAGRAM_NODE_PREFIX = "n";

/** What mermaid would read as syntax inside a node label. */
export const MERMAID_LABEL_ESCAPES: ReadonlyMap<string, string> = new Map([
  ["<", "#lt;"],
  [">", "#gt;"],
  ['"', "#quot;"],
]);

/** Header of the run or project summary table. */
export const MARKDOWN_SUMMARY_HEADER = "| Measure | Value |\n| --- | --- |";

/** Header of the module-spread table. */
export const MARKDOWN_SPREAD_HEADER =
  "| Callable | Spread | Calls directly | Location |\n| --- | --- | --- | --- |";

/** Header of the misplaced-callable table. */
export const MARKDOWN_MISPLACED_HEADER =
  "| Callable | Declared in | Called from | Callers |\n| --- | --- | --- | --- |";
