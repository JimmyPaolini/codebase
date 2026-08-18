// 🏷️ Types

/** A report the aggregate `reporting` command can drive. */
export interface ReportableCommand {
  /**
   * Renders the report body — heading and content, without the markers.
   *
   * May return synchronously: a report that reads no files should not have to
   * pretend it does.
   */
  renderReport(options: ReportOptions): Promise<string> | string;
  readonly reportLabel: string;
  /** Markers the rendered body is wrapped in, and replaced between. */
  readonly reportMarkers: ReportMarkers;
}

/** Where a rendered report should land. */
export interface ReportDestination {
  /** Markdown file to splice the section into, between its markers. */
  markdown: string | undefined;
  /** File to write the section to on its own. */
  output: string | undefined;
}

/**
 * Options accepted by the aggregate `reporting` command.
 *
 * Typed loosely because commander skips an option's parser when the flag
 * arrives without a value, handing the command `true` instead of text.
 */
export interface ReportingCommandOptions {
  baseline?: unknown;
  baselineUrl?: unknown;
  markdown?: unknown;
}

/** The HTML comments delimiting one report's section inside a document. */
export interface ReportMarkers {
  end: string;
  start: string;
}

/**
 * Options every report is offered.
 *
 * A report that has nothing to compare against ignores the baseline; asking
 * for one is common enough across reports to belong here rather than in each.
 */
export interface ReportOptions {
  baseline: string | undefined;
  baselineUrl: string | undefined;
}
