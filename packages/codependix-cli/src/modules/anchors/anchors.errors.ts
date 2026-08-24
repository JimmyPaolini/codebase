// 🚨 Errors

/**
 * Raised when a named anchor block is not present in a Markdown file.
 *
 * Raised for both `--check` and `--write`: creating a brand-new anchor block
 * unattended risks appending it to the wrong place in an author's document, so
 * codependix always requires a human to place the markers once, by hand.
 */
export class AnchorNotFoundError extends Error {
  constructor(anchorName: string, filePath: string) {
    super(`Anchor "${anchorName}" not found in ${filePath}`);
    this.name = "AnchorNotFoundError";
  }
}
