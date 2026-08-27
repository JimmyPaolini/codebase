import {
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
} from "@codometer/configuration";

import type { ResolvedCodometerMarkdownOutputConfiguration } from "@codometer/configuration";

// ♟️ Constants

/**
 * The markdown destination the console falls back to.
 *
 * A run that names no markdown file still prints badges, and rendering the
 * block needs markers even when nothing is ever spliced. These are the same
 * defaults a configuration inherits, so what is printed matches what would
 * have been written byte for byte.
 */
export const DEFAULT_MARKDOWN_DESTINATION: ResolvedCodometerMarkdownOutputConfiguration =
  {
    description: undefined,
    endMarker: DEFAULT_MARKDOWN_END_MARKER,
    path: undefined,
    render: undefined,
    startMarker: DEFAULT_MARKDOWN_START_MARKER,
    write: undefined,
  };
