// ♟️ Constants

/** Matches exactly one hexadecimal digit, upper or lower case. */
export const HEXADECIMAL_DIGIT_PATTERN = /^[0-9a-f]$/iu;

// 🚨 Errors

/**
 * Thrown when a Code carries a character outside the hexadecimal alphabet.
 *
 * Named after the whole Code rather than the character's own position,
 * since a decoder reading one digit at a time has nothing more specific to
 * blame a misspelling on.
 */
export class InvalidCodeCharacterError extends Error {
  constructor(character: string, code: string) {
    super(
      `Code "${code}" carries "${character}", which is not a hexadecimal digit`,
    );
    this.name = "InvalidCodeCharacterError";
  }
}

/**
 * Thrown when a Code's length disagrees with the grid `rows` and `columns`
 * describe: one hexadecimal character per interior lattice point, and a
 * grid of `rows` rows has `rows - 1` of those, `columns` wide.
 */
export class InvalidCodeLengthError extends Error {
  constructor(code: string, rows: number, columns: number) {
    const expected = (rows - 1) * columns;
    super(
      `Code "${code}" is ${code.length} characters, but ${rows} rows and ${columns} columns need ${expected}`,
    );
    this.name = "InvalidCodeLengthError";
  }
}
