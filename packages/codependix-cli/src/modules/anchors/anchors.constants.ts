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
