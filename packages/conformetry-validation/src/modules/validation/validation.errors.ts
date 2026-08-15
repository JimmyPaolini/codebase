// 🏷️ Types

/**
 * Raised when a run needs a language package that cannot be loaded.
 *
 * Reported rather than skipped: a template holding `.py` files means Python is
 * meant to be checked, and quietly validating less than the caller expects is
 * the failure this whole mechanism exists to avoid.
 */
export class MissingLanguagePackageError extends Error {
  constructor(args: {
    extensions: string[];
    reason: string;
    specifier: string;
  }) {
    super(
      `Validating ${args.extensions.join(", ")} needs ${args.specifier}, but ${args.reason}. Install it, or remove those files from the instance globs.`,
    );
    this.name = "MissingLanguagePackageError";
  }
}
