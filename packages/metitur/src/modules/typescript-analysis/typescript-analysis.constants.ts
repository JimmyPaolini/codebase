// ♟️ Constants

/** Regex matching TODO and FIXME annotations inside comments. */
export const TODO_REGEX =
  /\/\/.*\b(?:TODO|FIXME)\b|\/\*[\s\S]*?\b(?:TODO|FIXME)\b[\s\S]*?\*\//g;

/** File extensions treated as JavaScript (not TypeScript). */
export const JS_EXTENSIONS = new Set([".cjs", ".js", ".jsx", ".mjs"]);
