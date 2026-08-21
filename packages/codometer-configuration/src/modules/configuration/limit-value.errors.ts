// 🚨 Errors

/**
 * Raised when a limit's value cannot be read as a number of anything.
 *
 * Loud rather than lenient. A value nobody can read has no defensible reading:
 * taken as zero it gates every metric at nothing, and ignored it gates
 * nothing at all. Both look like a working limit from the outside.
 */
export class InvalidLimitValueError extends Error {
  constructor(metric: string, value: string) {
    super(
      `Cannot read the limit on "${metric}" from "${value}". Write a number, or a string carrying a decimal unit — "8 KB" is 8000 bytes and "1 MB" is 1000000. The trailing "b" is required, so "8 K" is not a size.`,
    );
    this.name = "InvalidLimitValueError";
  }
}
