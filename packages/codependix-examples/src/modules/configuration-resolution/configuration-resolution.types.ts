// 🏷️ Types

/**
 * One project's resolved `nx` export, as a row in the resolution table.
 *
 * Flattened deliberately: the point of the table is that four projects sharing
 * one configuration resolve four different ways, and a reader comparing them
 * should not have to read four nested objects to see it.
 */
export interface ResolutionRow {
  /** Where the export lands, rendered as prose. */
  readonly destination: string;
  readonly projectName: string;
  /** Workspace-relative root, which the glob lists match as well as the name. */
  readonly projectRoot: string;
  /** The resolved export target — `both`, `json`, `markdown`, or `none`. */
  readonly target: string;
}
