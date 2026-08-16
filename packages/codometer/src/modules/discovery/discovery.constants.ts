// ♟️ Constants

/** File extensions treated as TypeScript source. */
export const TS_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

/** File extensions treated as JavaScript source. */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);

/** Path segments that cause a file to be excluded from analysis. */
export const EXCLUDE_PATHS = [
  "node_modules/",
  "dist/",
  ".nx/",
  "build/",
  "coverage/",
  "notepads/",
  "/templates/",
] as const;

/** Regex matching test and spec file names. */
export const TEST_FILE_REGEX =
  /\.(test|spec|unit\.test|integration\.test|end-to-end\.test)\.[cm]?[jt]sx?$/;
