// 🏷️ Types

import type {
  CodeStatisticsResult,
  ResolvedCodometerMarkdownOutputConfiguration,
} from "@codometer/configuration";

/** Arguments accepted when building the anchor helpers a writer is handed. */
export interface BuildAnchorHelpersArguments {
  check: boolean;
  content: string;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
}

/** Arguments accepted when rendering the built-in badge report. */
export interface RenderBadgesArguments {
  destination: ResolvedCodometerMarkdownOutputConfiguration;
  statistics: CodeStatisticsResult;
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
  statistics: CodeStatisticsResult;
}

/** Arguments accepted when wrapping rendered content in the anchor markers. */
export interface WrapInAnchorsArguments {
  content: string;
  destination: ResolvedCodometerMarkdownOutputConfiguration;
}
