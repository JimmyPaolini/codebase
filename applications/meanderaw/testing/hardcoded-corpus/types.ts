// 🏷️ Types

/**
 * One committed drawing from the named-type half of the sweep, addressed on
 * the lattice and ready to become a hardcoded Code constant.
 *
 * {@link path} is not part of a `HardcodedMeanderEntry` row — it exists only
 * so a duplicate `code` can be reported against the two files that produced
 * it, before either is written into a constants file.
 */
export interface CollectedHardcodedMeander {
  readonly code: string;
  readonly columns: number;
  readonly family: string;
  readonly path: string;
  readonly rows: number;
  readonly subFamily?: string;
}
