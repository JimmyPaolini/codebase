// 🏷️ Types

import type {
  InstanceCandidate,
  MatchedInstance,
  TemplateDefinition,
  UnmatchedInstance,
} from "@conformetry/configuration";
import type { ValidationFileResult } from "@conformetry/core";

/** Every finding one matched instance produced, kept with the instance. */
export interface InstanceFileResults {
  readonly fileResults: ValidationFileResult[];
  readonly instance: MatchedInstance;
}

/**
 * Imports a language package by specifier.
 *
 * Supplied by the host rather than called here, because resolution depends on
 * where the host installed its language packages: the CLI finds them through
 * its own dependencies, an Nx plugin through the workspace it runs in.
 */
export type LanguageModuleLoader = (specifier: string) => Promise<unknown>;

/** A language package conformetry can load on demand. */
export interface LanguagePackage {
  /** Extensions this package's validator claims. */
  readonly extensions: string[];
  /** Name of the NestJS module the package exports. */
  readonly moduleExport: string;
  /** Name of the validator service the package exports. */
  readonly serviceExport: string;
  /** Import specifier, resolved only when one of its extensions is in play. */
  readonly specifier: string;
}

/** Arguments for one validation run. */
export interface RunValidationArguments {
  /**
   * The directories and files to validate. Callers expand their own globs —
   * an Nx plugin filters by project tags, the CLI reads the config — so this
   * package never needs to know what a workspace is.
   */
  readonly candidates: InstanceCandidate[];
  /**
   * Language names (`typescript`, `json`, …) to restrict the run to. Every
   * language runs when this is absent or empty.
   */
  readonly languageNames?: string[];
  /**
   * How to import a language package. Defaults to a plain dynamic `import`,
   * which resolves relative to this package.
   */
  readonly loadLanguageModule?: LanguageModuleLoader;
  /**
   * The templates candidates are matched against. Supplied rather than read
   * from a root directory, because a template's location is a property of the
   * generator that owns it.
   */
  readonly templates: TemplateDefinition[];
}

/** The outcome of one validation run. */
export interface RunValidationResult {
  /** Every directory that was compared against a template. */
  readonly checkedPaths: string[];
  readonly fileResults: ValidationFileResult[];
  readonly ok: boolean;
  /**
   * Candidates that matched no template, or matched two equally well. These
   * are findings in their own right: a glob is the caller asserting the path
   * is an instance, so matching nothing means the instance has drifted or the
   * glob is wrong.
   */
  readonly unmatched: UnmatchedInstance[];
}
