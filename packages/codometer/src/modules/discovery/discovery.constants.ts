// ♟️ Constants

/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** File extensions treated as markdown prose. */
export const MARKDOWN_EXTENSIONS = new Set([".markdown", ".md", ".mdx"]);

/**
 * Path segments that cause a file to be excluded from analysis.
 *
 * The last two are ingested corpus and generated output rather than authored
 * source. They are committed, so `git ls-files` reports them, and they are
 * overwhelmingly markdown: left in, they supply 88% of the repository's
 * markdown files and bury every prose metric under the data payload.
 * `markdownlint` and `cspell` already ignore both for the same reason.
 */
export const EXCLUDE_PATHS = [
  "node_modules/",
  "dist/",
  ".nx/",
  "build/",
  "coverage/",
  "notepads/",
  "/templates/",
  "applications/lexico-ingestion/data/",
  "applications/affirmations/output/",
] as const;

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
