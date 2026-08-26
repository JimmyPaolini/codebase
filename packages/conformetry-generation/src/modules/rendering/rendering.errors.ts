// 🏷️ Types

/**
 * Raised when a template interpolates a placeholder nobody supplied a value
 * for.
 *
 * Refusing is the only outcome that cannot be mistaken for success: mustache
 * would render the placeholder as an empty string, and because generation and
 * validation render identically, both halves of the loop would lose the same
 * value and agree that nothing was wrong. Section tags are exempt, and why is
 * in this package's README.
 */
export class MissingSubstitutionError extends Error {
  constructor(args: { placeholders: readonly string[]; subject: string }) {
    const asked = args.placeholders
      .map((placeholder) => `{{${placeholder}}}`)
      .join(", ");

    super(
      `No value was supplied for ${asked} while rendering ${args.subject}. Declare each one as an input of the generator, and in the matching instance group's substitutions.`,
    );
    this.name = "MissingSubstitutionError";
  }
}
