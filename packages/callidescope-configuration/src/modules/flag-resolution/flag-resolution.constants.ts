// ♟️ Constants

import { CALLIDESCOPE_OUTPUT_FORMATS } from "../configuration/configuration.constants";
import { InputError } from "../input/input.constants";

// 🚫 Refusals

// A deliberate misspelling: the example of a `--format` value nobody
// recognizes, which is exactly what this refusal is about.
// cspell:ignore mermiad

/**
 * Says a format nobody recognizes is a typo rather than a request.
 *
 * Rewriting it to markdown is what this replaces: a run that quietly ignored
 * `--format mermiad` printed a tree, exited 0, and taught its reader that the
 * flag does nothing.
 */
export const buildUnknownFormatMessage = (value: string): string =>
  `--format does not accept "${value}". It takes one of ${CALLIDESCOPE_OUTPUT_FORMATS.map(
    (format) => `"${format}"`,
  ).join(", ")}.`;

/**
 * Says a path flag has nothing to override.
 *
 * The whole of the precedence rule in one sentence: a flag may change a value
 * the configuration already declares and may not supply one it left out. A
 * flag that could conjure a destination would let any command line write a
 * report the configuration never asked for, which is how a requirement that
 * configuration be complete gets circumvented from a terminal.
 */
export const buildUndeclaredDestinationMessage = (args: {
  field: string;
  flag: string;
}): string =>
  `${args.flag} overrides a destination the configuration does not declare. Add \`${args.field}\` to the configuration this run reads, then use ${args.flag} to send it somewhere else.`;

/**
 * One refusal covering every flag a command line got wrong.
 *
 * An `InputError` rather than a class of its own: to whoever catches it this
 * is the same event as any other unusable command line — nothing was
 * attempted, and the fix is to retype the flags.
 */
export const flagResolutionError = (reasons: readonly string[]): InputError =>
  new InputError(reasons.join(" "));
