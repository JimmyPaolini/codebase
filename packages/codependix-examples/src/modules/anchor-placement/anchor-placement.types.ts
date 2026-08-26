// 🏷️ Types

/** One anchor placed into a file, with or without a subheading above it. */
export interface AnchorPlacement {
  readonly anchorName: string;
  readonly subheading: string | undefined;
}

/**
 * One branch of the auto-creation rule, as a section to render.
 *
 * Held as data so the branches read as cases of one rule rather than as
 * hand-written sections: what varies between them is only the file being
 * spliced, whether a subheading is placed above the anchor, and what was
 * already spliced into that file first.
 */
export interface AnchorPlacementCase {
  /** Anchor the export is placed in. */
  readonly anchorName: string;
  /** The file's content before anything is spliced into it. */
  readonly fileContent: string;
  /** Heading the rendered section carries. */
  readonly heading: string;
  /** A sentence saying what to look at in the result. */
  readonly note: string;
  /**
   * Placements applied to `fileContent` before this one.
   *
   * Non-empty for exactly one case: a second graph type landing under a
   * `## 🕸️ Codependix` section an earlier graph type already created.
   */
  readonly previousPlacements: AnchorPlacement[];
  /** `### <subheading>` placed above the anchor, or none for the workspace. */
  readonly subheading: string | undefined;
}
