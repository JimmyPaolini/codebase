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

/**
 * Every project's outcome from one graph-type pass — the projects that
 * finished, and the projects that failed before their exports could be
 * resolved.
 *
 * Kept apart rather than folded into one list: a caller deciding a run's exit
 * code needs both a stale export and a failed project to fail it, and a caller
 * only interested in what was actually written needs `results` alone.
 */
export interface GraphRunOutcome {
  failures: ProjectRunFailure[];
  results: ProjectRunResult[];
}

/**
 * Names the `## 🕸️ Codependix` section text a caller wants auto-created when
 * its anchored Markdown destination is missing.
 *
 * Carried as its own field on `DeliverGraphOutputArguments` rather than
 * folded into `ResolvedCodependixGraphOutput`: the section heading and intro
 * line are fixed per graph type, not something a workspace's configuration
 * file resolves, so they are supplied by `MapService` at the call site
 * instead of flowing through configuration resolution.
 */
export interface MarkdownSectionArguments {
  introLine: string;
  /**
   * The `### <subheading>` placed above the anchor block, or `undefined` for
   * the workspace README, whose Workspace Graph anchor sits directly under
   * the `## 🕸️ Codependix` heading with no subheading of its own.
   */
  subheading: string | undefined;
}

/**
 * One project's outcome after it raised before its exports could be
 * resolved — a missing anchor, or a NestJS project that failed to boot its
 * container.
 *
 * Kept apart from `ProjectRunResult` rather than added to it as an optional
 * field: a result is either something that was resolved (current or stale) or
 * something that never got that far, and the two should not be representable
 * at once.
 */
export interface ProjectRunFailure {
  error: string;
  projectName: string;
}

/** One project's outcome after its configured destinations were resolved. */
export interface ProjectRunResult {
  isCurrent: boolean;
  projectName: string;
  stalePaths: string[];
}
