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

/**
 * Glob `createNodes` matches.
 *
 * It covers the conformetry configuration as well as every `project.json`,
 * even though only the latter describes a project. Nx re-runs a plugin — and
 * so invalidates cached sync-generator results — when a file matching its glob
 * changes, and the generators a workspace has come from that configuration. A
 * glob of `project.json` alone left the daemon reporting a stale "up to date"
 * after the configuration was edited.
 */
export const PROJECT_CONFIGURATION_GLOB =
  "**/{project.json,conformetry.config.*}";

/** Basename that marks a matched file as an actual project description. */
export const PROJECT_CONFIGURATION_FILENAME = "project.json";

/**
 * Key the plugin's application context is cached under on `globalThis`.
 *
 * Global rather than module-level so that loading this module twice — which
 * Nx's plugin isolation can do — still yields one NestJS context per process.
 */
export const PLUGIN_CONTEXT_GLOBAL_KEY = "__conformetryPluginContext";

/**
 * Root of the workspace-level project, which is skipped during inference.
 *
 * Every instance in the workspace sits inside it, so inferring a target there
 * would duplicate every other project's work under one uncacheable task.
 */
export const WORKSPACE_PROJECT_ROOT = ".";
