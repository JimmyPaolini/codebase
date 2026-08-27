// 🏷️ Types

import type {
  CodeStatisticsResult,
  CodometerCompression,
  CodometerDocumentationUnit,
  CodometerSymbolKind,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";

/** Arguments accepted when building the anchor helpers a writer is handed. */
export interface BuildAnchorHelpersArguments {
  check: boolean;
  content: string;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
}

/**
 * One documented declaration whose JSDoc comment ran over its kind's limit.
 *
 * A rendering-only shape: only the fields a bullet needs, so this package
 * never has to know the richer measurement type the caller carries it in.
 */
export interface DocumentationBreach {
  declaration: string;
  file: string;
  kind: CodometerSymbolKind;
  limit: number;
  line: number;
  measured: number;
  unit: CodometerDocumentationUnit;
}

/**
 * What a run measured: one project, or the repository holding it.
 *
 * Carried into the rendering because the first badge group is named after it.
 * A run scoped to `packages/logger` reporting a `Repository` heading names the
 * whole workspace for figures that only ever covered one package.
 */
export type MeasurementScope = "project" | "repository";

/** Arguments accepted when rendering the built-in badge report. */
export interface RenderBadgesArguments {
  destination: ResolvedCodometerMarkdownOutputConfiguration;
  scope: MeasurementScope;
  statistics: CodeStatisticsResult;
  targets: readonly TargetSize[];
}

/** Arguments accepted when rendering a whole document of badges. */
export interface RenderDocumentArguments {
  /** Placed above the badges, exactly as a spliced block places it. */
  description: string | undefined;
  scope: MeasurementScope;
  statistics: CodeStatisticsResult;
  targets: readonly TargetSize[];
}

/** Arguments accepted when rendering the breached documentation entries. */
export interface RenderDocumentationSectionArguments {
  breaches: readonly DocumentationBreach[];
}

/** Arguments accepted when splicing a rendered block into a file. */
export interface SyncAnchoredBlockArguments {
  check: boolean;
  content: string;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
  path: string | undefined;
}

/** Arguments accepted when syncing a markdown destination with the statistics. */
export interface SyncMarkdownArguments {
  check: boolean;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
  scope: MeasurementScope;
  statistics: CodeStatisticsResult;
  targets: readonly TargetSize[];
}

/**
 * One declared target's measured size, as the badge block reports it.
 *
 * Only the targets a run actually measured the size of reach this. A run that
 * declared none — the whole-repository run, which measures source and has no
 * build output of its own — renders no size badges at all, so the aggregate
 * README keeps the single `Repository Size` figure it already carries.
 */
export interface TargetSize {
  bytes: number;
  compression: CodometerCompression;
  name: string;
}

/** Arguments accepted when wrapping rendered content in the anchor markers. */
export interface WrapInAnchorsArguments {
  content: string;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
}
