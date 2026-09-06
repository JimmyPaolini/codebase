// ♟️ Constants

/**
 * Whether a `new` expression pushes a frame.
 *
 * It does. Constructors in this repository do real work — reading files,
 * building indexes — so treating construction as free would understate every
 * stack that runs through one.
 */
export const INCLUDE_CONSTRUCTOR_EDGES = true;

/** File a project's embedded section is spliced into. */
export const PROJECT_README_NAME = "README.md";

// 🚨 Errors

/**
 * Raised when a declared `entryPoints.addresses` entry named no callable, or
 * more than one.
 *
 * Fatal to the whole run rather than logged and stepped over. A rename that
 * silently drops a declared root would otherwise lower the project's measured
 * depth with nothing in the output to say so — the same failure codometer
 * already refuses when a limit binds to no metric, and the spec this feature
 * shipped from names it the single highest-value refusal in it. One error
 * covers every unresolved address a run found, so a run with several
 * problems is fixed from one message rather than one refusal at a time.
 *
 * Takes the sentences already written rather than the addresses themselves:
 * wording one of them needs `AddressService` to render an ambiguous address's
 * candidates, and a `*.constants.ts` that reaches a service is not holding
 * constants. `CallidescopeCommand` writes them; this only joins them.
 */
export class UnresolvedEntryPointAddressError extends Error {
  constructor(descriptions: readonly string[]) {
    super(UnresolvedEntryPointAddressError.joinDescriptions(descriptions));
    this.name = "UnresolvedEntryPointAddressError";
  }

  /**
   * Joins one sentence per unresolved address into one refusal.
   *
   * Numbered and counted rather than run together: these reach a log line the
   * logger prints on a single line, so six sentences with nothing between them
   * arrive as a paragraph with no way to see where one problem ends and the
   * next begins. A lone problem is left as the sentence it is, since numbering
   * a list of one is noise.
   */
  private static joinDescriptions(descriptions: readonly string[]): string {
    const [only] = descriptions;

    if (only !== undefined && descriptions.length === 1) {
      return only;
    }

    const numbered = descriptions
      .map((description, index) => `(${String(index + 1)}) ${description}`)
      .join(" ");

    return `${String(descriptions.length)} declared entry points did not resolve. ${numbered}`;
  }
}
