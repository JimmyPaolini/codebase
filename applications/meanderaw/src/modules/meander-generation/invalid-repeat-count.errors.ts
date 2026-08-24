/** Thrown when `repeatCount` falls outside the shared minimum and maximum. */
export class InvalidRepeatCountError extends Error {
  constructor(repeatCount: number, minimum: number, maximum: number) {
    super(
      `repeatCount must be between ${minimum} and ${maximum}, received ${repeatCount}`,
    );
    this.name = "InvalidRepeatCountError";
  }
}
