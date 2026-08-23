// ♟️ Constants

/**
 * The client a live read goes through.
 *
 * Named rather than spelled at the call site, so what a PATH-shadowed
 * executable in a test has to be called is stated in one place.
 */
export const GITHUB_CLI_BINARY = "gh";

/** The variable GitHub Actions sets to the file a step's summary is read from. */
export const STEP_SUMMARY_VARIABLE = "GITHUB_STEP_SUMMARY";

/** Said when the mirror fails, so a silent summary is never a silent bug. */
export const STEP_SUMMARY_FAILURE_MESSAGE =
  "⚠️ Unable to write the report to GITHUB_STEP_SUMMARY";

/** The label a remediation command names when no number was supplied. */
export const PLACEHOLDER_ISSUE_NUMBER = "<number>";

/** The two labels that may declare who opened an issue, and nothing else. */
export const SOURCE_LABELS = ["source:agent", "source:human"];

/** How the three label families are recognized. */
export const SCOPE_LABEL_PREFIX = "scope:";
export const SOURCE_LABEL_PREFIX = "source:";
export const TYPE_LABEL_PREFIX = "type:";

/**
 * The exact field labels `issue.yml` gives its Type and Scope dropdowns.
 *
 * GitHub renders a submitted issue form field as `### <label>` followed by
 * the answer, using the field's authored `label:` verbatim — so these must
 * track `.github/ISSUE_TEMPLATE/issue.yml` exactly, not the conventional
 * config's own naming.
 */
export const TYPE_FIELD_LABEL = "Type";
export const SCOPE_FIELD_LABEL = "Scope";

/** An issue number, as an argument may spell one. */
export const ISSUE_NUMBER_PATTERN = /^\d+$/u;

/** How to run this check, printed whenever the input could not be used. */
export const USAGE_LINES = [
  "Usage: validation issue-metadata <issue-number>",
  "   or: ISSUE_BODY=… ISSUE_LABELS=… validation issue-metadata",
];
