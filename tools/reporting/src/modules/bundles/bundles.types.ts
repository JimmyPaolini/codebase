// 🏷️ Types

/** A measured bundle joined to its project and baseline. */
export interface BundleRow {
  baseSize: number | undefined;
  /** False when this run did not rebuild the project, so `main` sizes stand in. */
  measured: boolean;
  /** True when size-limit matched no files, which means a broken `path` glob. */
  missing: boolean;
  name: string;
  passed: boolean;
  project: string;
  /** True when the baseline had this bundle and the current build does not. */
  removed: boolean;
  size: number;
  sizeLimit: number | undefined;
}

/**
 * Options accepted by the `bundles` command.
 *
 * Typed loosely because commander skips an option's parser when the flag
 * arrives without a value, handing the command `true` instead of text.
 */
export interface BundlesCommandOptions {
  baseline?: unknown;
  baselineUrl?: unknown;
  markdown?: unknown;
  output?: unknown;
}

/** Arguments for reading one project's report and its baseline. */
export interface CollectProjectRowsArguments extends CollectRowsArguments {
  reportPath: string;
}

/** Arguments for joining measured reports to a baseline. */
export interface CollectRowsArguments {
  baselineDirectory: string | undefined;
  workingDirectory: string;
}

/** A row this run rebuilt that the baseline also knew, so it carries a size. */
export type ComparableBundleRow = BundleRow & { baseSize: number };

/**
 * One measured bundle, as `size-limit --json` emits it.
 *
 * `size` is normalized to a number when the report is parsed: size-limit omits
 * it when a `path` glob matched nothing, and every reader downstream would
 * otherwise need the same fallback.
 */
export interface SizeLimitEntry {
  name: string;
  passed?: boolean | undefined;
  size: number;
  sizeLimit?: number | undefined;
}
