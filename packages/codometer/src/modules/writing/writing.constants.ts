// ♟️ Constants

/** Opening marker for the generated code statistics badge block. */
export const STATISTICS_BLOCK_START = "<!-- CODE_STATISTICS_START -->";

/** Closing marker for the generated code statistics badge block. */
export const STATISTICS_BLOCK_END = "<!-- CODE_STATISTICS_END -->";

/** Regex matching the entire generated badge block between the markers. */
export const STATISTICS_BLOCK_REGEX =
  /<!-- CODE_STATISTICS_START -->[\s\S]*?<!-- CODE_STATISTICS_END -->/;
