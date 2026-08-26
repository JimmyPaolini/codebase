// 🏷️ Types

/**
 * A row in one of the example's two scanner tables.
 *
 * The tables are built from `SCANNER_CASES` and `SCANNER_NON_CASES` so a case
 * is named in exactly one place, and a fixture that stops demonstrating one
 * fails the example rather than leaving the table quietly wrong.
 */
export interface ScannerCase {
  readonly description: string;
  readonly file: string;
}
