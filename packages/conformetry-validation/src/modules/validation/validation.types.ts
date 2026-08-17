// 🏷️ Types

import type {
  Instance,
  MatchedInstance,
  TemplateDefinition,
  UnmatchedInstance,
} from "@conformetry/configuration";
import type { InstanceScore, ValidationFileResult } from "@conformetry/core";

/** Every finding one matched instance produced, kept with the instance. */
export interface InstanceFileResults {
  readonly fileResults: ValidationFileResult[];
  readonly instance: MatchedInstance;
  /** Combined weight of everything this instance's template asked for. */
  readonly totalWeight: number;
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
  readonly instances: Instance[];
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
   * The templates instances are matched against. Supplied rather than read
   * from a root directory, because a template's location is a property of the
   * generator that owns it.
   */
  readonly templates: TemplateDefinition[];
  /**
   * Lowest score any instance may have, unless its template or its instance
   * group says otherwise. The weakest of the three levels.
   */
  readonly threshold?: number;
}

/** The outcome of one validation run. */
export interface RunValidationResult {
  /** Every directory that was compared against a template. */
  readonly checkedPaths: string[];
  readonly fileResults: ValidationFileResult[];
  readonly ok: boolean;
  /** One score per matched instance, in the order they were matched. */
  readonly scores: InstanceScore[];
  /**
   * Instances that matched no template, or matched two equally well. These
   * are findings in their own right: a glob is the caller asserting the path
   * is an instance, so matching nothing means the instance has drifted or the
   * glob is wrong.
   */
  readonly unmatched: UnmatchedInstance[];
}

/** Arguments for scoring one matched instance. */
export interface ScoreInstanceArguments {
  readonly fileResults: ValidationFileResult[];
  readonly instance: MatchedInstance;
  /** Run-level threshold, from a `--threshold` flag. The weakest level. */
  readonly runThreshold?: number | undefined;
  readonly totalWeight: number;
}

/** Arguments for scoring every matched instance of a run. */
export interface ScoreInstancesArguments {
  readonly groups: InstanceFileResults[];
  /** Run-level threshold, from a `--threshold` flag. The weakest level. */
  readonly runThreshold?: number | undefined;
}
