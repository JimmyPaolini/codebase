// 🏷️ Types

import type {
  CallGraphResult,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
} from "@callidescope/configuration";

/** One project's section and the README it belongs in. */
export interface ProjectSection {
  readonly content: string;
  readonly path: string;
}

/** Arguments for splicing a block between its anchors. */
export interface SyncAnchoredBlockArguments {
  readonly check: boolean;
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly path: string | undefined;
}

/**
 * Arguments for syncing the configured markdown destination.
 *
 * The rendered markdown arrives already built: what a report says belongs to
 * the report module, and this one only decides where it lands.
 */
export interface SyncMarkdownArguments {
  readonly check: boolean;
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly result: CallGraphResult;
}

/** Arguments for splicing a section into every traced project's README. */
export interface SyncProjectReadmesArguments {
  readonly check: boolean;
  readonly destination: ResolvedCallidescopeProjectReadmeConfiguration;
  readonly sections: readonly ProjectSection[];
}

/** Arguments for wrapping content in the configured anchors. */
export interface WrapInAnchorsArguments {
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
}
