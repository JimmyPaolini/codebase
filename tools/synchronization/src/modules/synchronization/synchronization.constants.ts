// ♟️ Constants

import type { SynchronizationKind } from "./synchronization.types";

/**
 * A synchronization whose committed file is derived from configuration.
 *
 * Drift is something the author of the change caused and can fix in the same
 * change, so these are checked on a pull request.
 */
export const SYNCHRONIZATION_KIND_DERIVATION: SynchronizationKind =
  "derivation";

/**
 * A synchronization that publishes a report generated from the code it describes.
 *
 * Drift is the branch not having caught up with a report the default branch
 * owns, which is nobody's mistake, so these are published there rather than
 * checked on a pull request.
 */
export const SYNCHRONIZATION_KIND_REPORT: SynchronizationKind = "report";

/**
 * Every kind `--kinds` accepts, in the order an error message lists them.
 *
 * Named here rather than spelled into each message, so the list a mistake is
 * measured against and the list it is told about can never drift apart.
 */
export const SYNCHRONIZATION_KINDS: SynchronizationKind[] = [
  SYNCHRONIZATION_KIND_DERIVATION,
  SYNCHRONIZATION_KIND_REPORT,
];

/**
 * Every kind again, as a set, for asking whether a written name is one.
 *
 * Derived from the list rather than written out a second time. A membership
 * test over the list itself is what `unicorn/prefer-includes` rewrites into an
 * `includes` call the union type then rejects, so the shape that reads as a
 * lookup is also the one that survives a formatter.
 */
export const SYNCHRONIZATION_KIND_SET: ReadonlySet<string> = new Set(
  SYNCHRONIZATION_KINDS,
);

/** How a `--kinds` value is written: one comma-separated set, no spaces needed. */
export const SYNCHRONIZATION_KIND_SEPARATOR = ",";
