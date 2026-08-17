// 🏷️ Types

import type {
  CallGraphResult,
  ResolvedCallidescopeMarkdownOutputConfiguration,
} from "@callidescope/configuration";

/** Arguments for rendering the markdown block. */
export interface RenderArguments {
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly result: CallGraphResult;
}

/** Arguments for splicing a block between its anchors. */
export interface SyncAnchoredBlockArguments {
  readonly check: boolean;
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
  readonly path: string | undefined;
}

/** Arguments for syncing the configured markdown destination. */
export interface SyncMarkdownArguments extends RenderArguments {
  readonly check: boolean;
}

/** Arguments for wrapping content in the configured anchors. */
export interface WrapInAnchorsArguments {
  readonly content: string;
  readonly destination: ResolvedCallidescopeMarkdownOutputConfiguration;
}
