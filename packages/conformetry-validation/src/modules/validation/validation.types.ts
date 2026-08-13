// 🏷️ Types

import type {
  InstanceCandidate,
  MatchedInstance,
  TemplateDefinition,
  UnmatchedInstance,
} from "@jimmypaolini/conformetry-configuration";
import type { ValidationFileResult } from "@jimmypaolini/conformetry-core";

/** Every finding one matched instance produced, kept with the instance. */
export interface InstanceFileResults {
  readonly fileResults: ValidationFileResult[];
  readonly instance: MatchedInstance;
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
