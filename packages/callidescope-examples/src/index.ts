import { normalizeLabel } from "./modules/plain-call/plain-call.utilities.js";

// 📤 Exports

/**
 * The `exported-function` entry-point kind.
 *
 * A function declared and exported from `src/index.ts` is a root because a
 * package's barrel is its contract with everything outside the repository —
 * nothing here has to call it for it to be reachable.
 */
export const normalizeExampleLabel = (label: string): string =>
  normalizeLabel(label);
