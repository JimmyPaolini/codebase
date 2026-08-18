// ♟️ Constants

/** Fraction of a limit above which a bundle is called out as nearly full. */
export const CROWDED_LIMIT = 0.9;

/** Heading the rendered section is filed under. */
export const HEADING = "## 🎒 Bundles";

/**
 * The block this report claims inside a shared document. HTML comments are
 * invisible once the markdown is rendered, and every other report claims its
 * own pair, so several can sit in one document without collision.
 */
export const BUNDLE_MARKERS = {
  end: "<!-- bundle-sizes:end -->",
  start: "<!-- bundle-sizes:start -->",
};

/** Fraction of growth above which an increase is called out rather than noted. */
export const SIGNIFICANT_GROWTH = 0.05;

/** Column headers for the per-bundle table. */
export const TABLE_HEADER = [
  "| | Project | Bundle | Size | `main` | Diff | % | Limit | Used |",
  "|--|---------|--------|------|--------|------|---|-------|------|",
];
