// 🏷️ Types

/**
 * Raised when a template interpolates a placeholder nobody supplied a value
 * for.
 *
 * Mustache renders an unknown placeholder as an empty string rather than
 * leaving the token visible, so this used to be the quietest failure the
 * toolchain had: the generator wrote a file with a value missing, and
 * validation rendered the same gap on the other side and found nothing to
 * report. Both halves agreed, and both were wrong. Refusing outright is the
 * only outcome that cannot be mistaken for success.
 *
 * Section tags are not covered by this, and deliberately: `{{#field}}` and
 * `{{^field}}` are conditionals, so an absent name is how a template asks for
 * a block to be skipped or taken.
 */
export class MissingSubstitutionError extends Error {
  constructor(args: { placeholders: readonly string[]; subject: string }) {
    const rendered = args.placeholders
      .map((placeholder) => `{{${placeholder}}}`)
      .join(", ");

    super(
      [
        `No value was supplied for ${rendered} while rendering ${args.subject}.`,
        "Declare each one as an input of the generator so that generation asks",
        "for it, and in the matching instance group's `substitutions` so that",
        "validation renders it the same way.",
      ].join(" "),
    );
    this.name = "MissingSubstitutionError";
  }
}
