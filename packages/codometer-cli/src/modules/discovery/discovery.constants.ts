// ♟️ Constants

/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** File extensions treated as markdown prose. */
export const MARKDOWN_EXTENSIONS = new Set([".markdown", ".md", ".mdx"]);

/** File extensions treated as JSON data. */
export const JSON_EXTENSIONS = new Set([".json", ".jsonc", ".jsonl"]);

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
