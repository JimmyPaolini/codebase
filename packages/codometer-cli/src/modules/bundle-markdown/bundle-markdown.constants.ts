// ♟️ Constants

/** Fraction of a limit above which a bundle is called out as nearly full. */
export const CROWDED_LIMIT = 0.9;

/** Heading the rendered section is filed under. */
export const HEADING = "## 🎒 Bundles";

/**
 * Markers wrapping the section so it can be replaced in a pull request
 * description without disturbing anything the author wrote. HTML comments are
 * invisible once GitHub renders the markdown.
 */
export const SECTION_END = "<!-- bundle-sizes:end -->";
export const SECTION_START = "<!-- bundle-sizes:start -->";

/** Fraction of growth above which an increase is called out rather than noted. */
export const SIGNIFICANT_GROWTH = 0.05;

/** Column headers for the per-bundle table. */
export const TABLE_HEADER = [
  "| | Project | Bundle | Size | `main` | Diff | % | Limit | Used |",
  "|--|---------|--------|------|--------|------|---|-------|------|",
];
