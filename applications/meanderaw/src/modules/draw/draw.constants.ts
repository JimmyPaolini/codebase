// ♟️ Constants

/**
 * Where the sweep writes the static index page, relative to the project root
 * every Nx target already runs from — the same convention
 * `DEFAULT_DATABASE_PATH` follows for the database it sits beside. The two
 * are the sweep's only committed artifacts now that the per-family SVG tree
 * is retired: one holds every meander's row, the other is a page built from
 * them.
 */
export const DEFAULT_INDEX_PATH = "output/index.html";

// 🚨 Errors

/**
 * Thrown when `--code` is given without both `--rows` and `--columns`.
 *
 * `--code` alone is what selects the single-drawing mode over the sweep, so
 * it cannot be `required` alongside the other two — the pair still has to be
 * checked once `--code` says which mode is meant.
 */
export class IncompleteCodeDrawingError extends Error {
  constructor() {
    super("drawing one meander by code needs both --rows and --columns");
    this.name = "IncompleteCodeDrawingError";
  }
}
