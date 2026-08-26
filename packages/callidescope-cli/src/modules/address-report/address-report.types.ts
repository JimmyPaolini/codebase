// 🏷️ Types

import type {
  CallableId,
  CallidescopeOutputFormat,
  SourceLocation,
} from "@callidescope/configuration";
import type {
  CallableDirectCalls,
  CallAddressTreeResult,
} from "@callidescope/graph";

/** Arguments for rendering one callable's direct callers and callees. */
export interface RenderBreadthArguments {
  readonly address: string;
  readonly directCalls: CallableDirectCalls;
  readonly displayName: string;
  readonly format: CallidescopeOutputFormat;
  readonly id: CallableId;
  readonly location: SourceLocation;
}

/** Arguments for rendering the paths traced above and below one callable. */
export interface RenderDepthArguments {
  readonly address: string;
  readonly downward: CallAddressTreeResult;
  readonly format: CallidescopeOutputFormat;
  readonly upward: CallAddressTreeResult;
}
