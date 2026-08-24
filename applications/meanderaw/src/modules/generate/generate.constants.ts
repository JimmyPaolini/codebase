// ♟️ Constants

import type { MeanderType } from "../meander-generation/meander-generation.types";

export const DEFAULT_OUTPUT_DIRECTORY = "output";

export const DEFAULT_REPEAT_COUNT = 6;

/**
 * Declared as `readonly string[]` rather than a literal tuple so
 * `Array.prototype.includes` can compare it directly against a raw
 * `string` without a type assertion.
 */
export const SUPPORTED_TYPES: readonly string[] = [
  "boxes",
] satisfies readonly MeanderType[];
