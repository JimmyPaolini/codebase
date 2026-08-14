// ♟️ Constants

import type { LanguagePackage } from "./validation.types";

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
