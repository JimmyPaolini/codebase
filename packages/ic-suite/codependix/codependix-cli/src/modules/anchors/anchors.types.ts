// 🏷️ Types

/** Result of comparing a Markdown file's anchor against freshly built content. */
export interface AnchorCheckResult {
  /** The content the anchor currently holds. */
  readonly currentContent: string;
  /** The content a fresh run would produce. */
  readonly freshContent: string;
  /** Whether the anchor already holds the fresh content. */
  readonly isCurrent: boolean;
}

/** Arguments shared by every method that reads or rewrites an anchor. */
export interface AnchorLocationArguments {
  anchorName: string;
  fileContent: string;
  filePath: string;
}

/** Arguments for auto-creating a missing anchor's section on write. */
export interface AnchorSectionInsertArguments {
  anchorName: string;
  content: string;
  fileContent: string;
  introLine: string;
  /**
   * The `### <Subheading>` placed immediately above the anchor block, or
   * `undefined` when the anchor sits directly under the `## 🕸️ Codependix`
   * heading with no subheading of its own — the workspace README's shape.
   */
  subheading: string | undefined;
}
