// ♟️ Constants

/**
 * Builds the opening marker of a named anchor block.
 *
 * codependix's own comment-marker syntax, independent of conformetry's marker
 * mechanism by design — see issue #242. Named anchors let one Markdown file
 * hold more than one block, such as an `nx` block today and an `nestjs` block
 * once `codependix-nestjs` ships, without the blocks colliding.
 */
export const buildStartMarker = (anchorName: string): string =>
  `<!-- codependix:start name="${anchorName}" -->`;

/** Builds the closing marker of a named anchor block. */
export const buildEndMarker = (anchorName: string): string =>
  `<!-- codependix:end name="${anchorName}" -->`;

/**
 * The single heading every project's (and the workspace's) auto-created
 * Codependix section is placed under.
 *
 * Matched literally against a whole line, so a heading a human wrote by hand
 * with this exact text is recognized and reused rather than duplicated — see
 * `AnchorsService.insertAnchorSection`.
 */
export const CODEPENDIX_SECTION_HEADING = "## 🕸️ Codependix";
