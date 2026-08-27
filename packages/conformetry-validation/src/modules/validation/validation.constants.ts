// ♟️ Constants

import type { LanguagePackage } from "./validation.types";

/**
 * Score an instance must reach when no threshold is configured anywhere.
 *
 * A perfect match, which is what conformetry has always demanded: adding
 * scoring must not quietly relax any existing run.
 */
export const DEFAULT_THRESHOLD = 1;

/**
 * Separator joining an instance path and a template name into a score key.
 * A NUL byte cannot occur in either, so it can never collide.
 */
export const SCORE_KEY_SEPARATOR = "\u0000";

/**
 * Separator joining an instance path and a template path into a deduplication
 * key. A NUL byte cannot occur in either, so it can never collide.
 */
export const FINDING_KEY_SEPARATOR = "\u0000";

/**
 * The language packages conformetry knows, keyed by the extensions they claim.
 *
 * The mapping is spelled out here rather than read from each package's own
 * descriptor, because the whole point is to decide whether to load a package
 * without importing it first. Keep it in step with each descriptor's
 * `fileExtensions`.
 */
export const LANGUAGE_PACKAGES: LanguagePackage[] = [
  {
    extensions: [".json", ".jsonc"],
    moduleExport: "JsonValidatorModule",
    serviceExport: "JsonValidatorService",
    specifier: "@conformetry/json",
  },
  {
    extensions: [".ipynb"],
    moduleExport: "JupyterValidatorModule",
    serviceExport: "JupyterValidatorService",
    specifier: "@conformetry/jupyter",
  },
  {
    extensions: [".md"],
    moduleExport: "MarkdownValidatorModule",
    serviceExport: "MarkdownValidatorService",
    specifier: "@conformetry/markdown",
  },
  {
    extensions: [".py"],
    moduleExport: "PythonValidatorModule",
    serviceExport: "PythonValidatorService",
    specifier: "@conformetry/python",
  },
  {
    extensions: [".ts", ".tsx"],
    moduleExport: "TypescriptValidatorModule",
    serviceExport: "TypescriptValidatorService",
    specifier: "@conformetry/typescript",
  },
];

/**
 * The validator every other extension falls back to.
 *
 * A required dependency rather than an optional one: it is the floor, so an
 * extension nobody claims is still compared line by line instead of going
 * unchecked.
 */
export const TEXT_LANGUAGE_PACKAGE: LanguagePackage = {
  extensions: [".txt"],
  moduleExport: "TextValidatorModule",
  serviceExport: "TextValidatorService",
  specifier: "@conformetry/text",
};

// 🚨 Errors

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
