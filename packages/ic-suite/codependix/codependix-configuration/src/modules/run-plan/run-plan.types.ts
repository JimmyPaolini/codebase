// 🏷️ Types

/** Command-line options `codependix` accepts. */
export interface MapCommandOptions {
  /**
   * The set of findings `--check` gates, unparsed.
   *
   * `true` is the flag written with no value at all, which is refused rather
   * than read as a shorthand — see `RunPlanService.selectMode`.
   */
  check?: string | true | undefined;
  config?: string | undefined;
  directory?: string | undefined;
  /** Overrides `exclude` for this run. Refused when never configured. */
  exclude?: string[] | undefined;
  /**
   * Builds, checks, and writes the `fileImports` graph type for this run.
   *
   * `undefined` when neither `--file-imports` nor `--no-file-imports` was
   * given, which leaves the graph type enabled — the behavior every run had
   * before this flag existed.
   */
  fileImports?: boolean | undefined;
  /**
   * What `--format` prints to standard output, unparsed.
   *
   * Defaults to `"markdown"` when the flag was left off entirely — unlike
   * codometer's `--format`, which falls back to a resolved configuration
   * field, codependix's configuration declares no such field, so the default
   * is a fixed constant instead.
   */
  format?: string | undefined;
  /** Overrides `include` for this run. Refused when never configured. */
  include?: string[] | undefined;
  /**
   * Writes every active graph type's data, combined into one JSON file at
   * this path, keyed by graph type name.
   */
  jsonOutput?: string | undefined;
  /**
   * Writes every active graph type's rendered diagram, combined into one
   * Markdown file at this path — each type's own anchor-spliced section,
   * the same splicing `DeliveryService` applies per project, applied here to
   * one shared destination instead.
   */
  markdownOutput?: string | undefined;
  /** Builds, checks, and writes the `nestjsModules` graph type for this run. */
  nestjsModules?: boolean | undefined;
  /** Builds, checks, and writes the `nxProjects` graph type for this run. */
  nxProjects?: boolean | undefined;
  /**
   * Projects to export for beyond what `include` already selects, unparsed.
   *
   * Comma-separated globs matched against a project's name or its
   * workspace-relative root.
   */
  projects?: string | undefined;
  /** Nx tags to export for beyond what `include` selects, unparsed. */
  tags?: string | undefined;
  write?: boolean | undefined;
}
