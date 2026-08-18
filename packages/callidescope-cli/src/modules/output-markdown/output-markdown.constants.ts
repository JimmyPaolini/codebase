// ♟️ Constants

/** Rows one generated table shows before it stops. */
export const MARKDOWN_TABLE_LIMIT = 20;

/** Header of the run-summary table. */
export const MARKDOWN_SUMMARY_HEADER = "| Measure | Value |\n| --- | --- |";

/** Header of the deep-call-stack table. */
export const MARKDOWN_STACK_HEADER =
  "| Entry point | Depth | Deepest frame | Location |\n| --- | --- | --- | --- |";

/** Header of the module-spread table. */
export const MARKDOWN_SPREAD_HEADER =
  "| Callable | Spread | Direct | Location |\n| --- | --- | --- | --- |";

/** Header of the misplaced-callable table. */
export const MARKDOWN_MISPLACED_HEADER =
  "| Callable | Declared in | Called from | Callers |\n| --- | --- | --- | --- |";
