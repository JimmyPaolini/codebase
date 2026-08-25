/** Thrown when `alternated`'s `period` falls outside the shared bounds, or `repeatCount` isn't a whole multiple of it. */
export class InvalidPeriodError extends Error {
  constructor(period: number, minimum: number, maximum: number) {
    super(
      `period must be between ${minimum} and ${maximum}, received ${period}`,
    );
    this.name = "InvalidPeriodError";
  }
}
