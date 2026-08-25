/** Thrown when `rows` falls outside a type's structural minimum or the shared maximum. */
export class InvalidRowsError extends Error {
  constructor(rows: number, minimum: number, maximum: number) {
    super(`rows must be between ${minimum} and ${maximum}, received ${rows}`);
    this.name = "InvalidRowsError";
  }
}
