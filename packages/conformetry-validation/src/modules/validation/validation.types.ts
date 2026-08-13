// 🏷️ Types

import type { ValidationFileResult } from "@jimmypaolini/conformetry-core";

/** Arguments for one validation run. */
export interface RunValidationArguments {
  readonly configurationPath?: string;
  /**
   * Project paths or names to validate. Every workspace project is validated
   * when this is absent.
   */
  readonly projectPaths?: string[];
  /**
   * Language names (`typescript`, `json`, …) or generator names to restrict
   * the run to. Both live in one namespace because both are things a user
   * means by "only check this".
   */
  readonly ruleNames?: string[];
  readonly workingDirectory: string;
}

/** The outcome of one validation run. */
export interface RunValidationResult {
  /** Every directory that was compared against a template. */
  readonly checkedPaths: string[];
  readonly fileResults: ValidationFileResult[];
  readonly ok: boolean;
}
