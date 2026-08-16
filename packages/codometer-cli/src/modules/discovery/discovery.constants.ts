// ♟️ Constants

/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** File extensions treated as markdown prose. */
export const MARKDOWN_EXTENSIONS = new Set([".markdown", ".md", ".mdx"]);

/**
 * File extensions treated as JSON data.
 *
 * `.ipynb` is deliberately absent: a notebook is JSON on disk, but measuring
 * it here would report a document whose cells nobody wrote by hand as prose
 * and code. The jupyter analyzer takes notebooks apart instead.
 */
export const JSON_EXTENSIONS = new Set([".json", ".jsonc", ".jsonl"]);

/** File extensions treated as Jupyter notebooks. */
export const NOTEBOOK_EXTENSIONS = new Set([".ipynb"]);

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
