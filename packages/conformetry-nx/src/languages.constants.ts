// ♟️ Constants

import * as jsonPackage from "@conformetry/json";
import * as jupyterPackage from "@conformetry/jupyter";
import * as markdownPackage from "@conformetry/markdown";
import * as pythonPackage from "@conformetry/python";
import * as textPackage from "@conformetry/text";
import * as typescriptPackage from "@conformetry/typescript";

import type { LanguageModuleLoader } from "@conformetry/validation";

/**
 * The language packages, imported statically and handed to the validator.
 *
 * `conformetry-validation` loads languages on demand through a dynamic import,
 * which is right for a published package but cannot work here: Nx runs its
 * plugins through a transpiler that owns the module graph it compiled, and a
 * late-bound import escapes to Node's own resolver, which cannot load
 * workspace TypeScript sources. Importing statically puts the packages in that
 * graph. The cost is that an Nx workspace installs every language rather than
 * the ones it uses; a library consumer still gets the on-demand behavior.
 *
 * These sit here rather than beside the plugin's other constants because the
 * plugin entry point imports that file for its glob, and anything the entry
 * point reaches is loaded while Nx builds the project graph — before any
 * project has been built. Six workspace packages there is what kept every
 * package in this plugin's closure resolving to TypeScript sources.
 */
export const LANGUAGE_MODULE_NAMESPACES: Record<string, unknown> = {
  "@conformetry/json": jsonPackage,
  "@conformetry/jupyter": jupyterPackage,
  "@conformetry/markdown": markdownPackage,
  "@conformetry/python": pythonPackage,
  "@conformetry/text": textPackage,
  "@conformetry/typescript": typescriptPackage,
};

/**
 * Hands `conformetry-validation` the language packages Nx pre-loaded.
 *
 * Rejecting on an unknown specifier keeps the missing-package reporting in one
 * place: `conformetry-validation` turns the rejection into a message naming
 * both the package and the extensions that needed it.
 */
export const LANGUAGE_MODULE_LOADER: LanguageModuleLoader = async (
  specifier,
) => {
  // Awaited so the constant matches the on-demand import it stands in for.
  const moduleNamespace = await Promise.resolve(
    LANGUAGE_MODULE_NAMESPACES[specifier],
  );

  if (moduleNamespace === undefined) {
    throw new Error(`Unknown conformetry language package: ${specifier}.`);
  }

  return moduleNamespace;
};
