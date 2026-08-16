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
