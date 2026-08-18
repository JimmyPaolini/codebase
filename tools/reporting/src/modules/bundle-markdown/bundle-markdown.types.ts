// 🏷️ Types

import type { BundleRow } from "../bundles/bundles.types";

/** A project's bundles, kept in the order its `.size-limit.cjs` declares them. */
export interface ProjectGroup {
  project: string;
  rows: BundleRow[];
}

/** Arguments for rendering the whole section. */
export interface RenderSectionArguments {
  baselineUrl: string | undefined;
  rows: readonly BundleRow[];
}

/** Workspace-wide totals, and the change against the baseline. */
export interface SizeSummary {
  delta: number | undefined;
  fraction: number | undefined;
  total: number;
}
