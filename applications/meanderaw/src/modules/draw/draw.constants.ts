// ♟️ Constants

// 🚨 Errors

/**
 * Thrown when `--code` is given without `--write`.
 *
 * Drawing one meander persists it as a row, and nothing writes the
 * committed database unless `--write` asks for it — so a Code named without
 * `--write` is refused rather than falling back to the drift check.
 */
export class CodeDrawingNeedsWriteError extends Error {
  constructor() {
    super("drawing one meander by code needs --write");
    this.name = "CodeDrawingNeedsWriteError";
  }
}

/**
 * Thrown when `--check` and `--write` are given together.
 *
 * The two name opposite modes — a read-only drift check and a sweep that
 * rewrites the committed database — so neither can quietly win.
 */
export class ConflictingDrawModeError extends Error {
  constructor() {
    super("--check and --write cannot be given together");
    this.name = "ConflictingDrawModeError";
  }
}

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
