// ♟️ Constants

/**
 * The start marker of any anchored block this convention recognizes, not
 * just the one a given destination owns.
 *
 * Used to find where a corrupted block — a start marker with no matching
 * end — has to stop being replaced: at another block's own territory,
 * never past it.
 */
export const FOREIGN_ANCHOR_PATTERN = /<!--\s*[A-Z0-9_]+_START\s*-->/;

// 🚨 Errors

/** Raised when the anchor helper is asked to write a file nothing named. */
export class MissingMarkdownPathError extends Error {
  constructor() {
    super(
      "No markdown path to write to. Set output.markdown.path, pass --markdown, or give syncAnchoredBlock a path of its own.",
    );
    this.name = "MissingMarkdownPathError";
  }
}
