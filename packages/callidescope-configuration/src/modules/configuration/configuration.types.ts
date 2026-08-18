// 🏷️ Types

import type { CallGraphResult } from "./call-graph.types";

/** The shape of a `callidescope.config.ts` default export. */
export interface CallidescopeConfiguration {
  /** Globs whose callables are exempt from the module-spread finding. */
  allowSpreadFor?: string[] | undefined;
  entryPoints?: CallidescopeEntryPoints | undefined;
  exclude?: string[] | undefined;
  /** Gitignore-syntax files listing paths to leave untraced. */
  excludeFrom?: string[] | undefined;
  limits?: CallidescopeLimits | undefined;
  output?: CallidescopeOutputConfiguration | undefined;
  /**
   * Projects to trace, by Nx project name. Every project when omitted.
   *
   * Narrowing this is the difference between a one-second pre-commit check and
   * a whole-workspace analysis, because each project needs its own program.
   */
  projects?: string[] | undefined;
}

/** Which callables are treated as the roots of a call stack. */
export interface CallidescopeEntryPoints {
  /**
   * Decorators whose methods a framework invokes.
   *
   * Matched against the decorator's own name, then confirmed against the
   * package that declares it, so a locally defined `Command` is not mistaken
   * for nest-commander's.
   */
  decorators?: string[] | undefined;
  /** Treat every `src/index.ts` export as a root. Defaults to true. */
  includeExportedFunctions?: boolean | undefined;
  /**
   * Promote callables nothing in the repository calls. Defaults to true.
   *
   * This is the safety net that makes a wrong rule set visible: without it, a
   * missing rule silently removes whole subtrees from every measurement.
   */
  includeOrphans?: boolean | undefined;
  /** Trace test files too. Defaults to false. */
  includeTests?: boolean | undefined;
}

/** JSON output destination. */
export interface CallidescopeJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/** Thresholds that decide what a run reports. */
export interface CallidescopeLimits {
  /**
   * Share of a callable's callers that must sit in one foreign module before it
   * is reported as misplaced. Between 0 (exclusive) and 1 (inclusive).
   */
  callerMajorityRatio?: number | undefined;
  /** Modules a callable must call directly before spread is reported. */
  directSpreadThreshold?: number | undefined;
  /** Frames a call stack may hold before it is reported. */
  maximumDepth?: number | undefined;
  /** Implementations one interface member may resolve to before giving up. */
  maximumImplementationFanOut?: number | undefined;
  /** Callers a callable needs before its placement is judged. */
  minimumCallers?: number | undefined;
  /** Distinct modules a callable's transitive callees may touch. */
  spreadThreshold?: number | undefined;
}

/** Markdown output destination. */
export interface CallidescopeMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  path: string;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  write?: undefined | WriteMarkdownOutput;
}

/** Where a run writes its findings. */
export interface CallidescopeOutputConfiguration {
  /** What the run prints to standard output. Markdown unless told otherwise. */
  format?: CallidescopeOutputFormat | undefined;
  json?: CallidescopeJsonOutputConfiguration | undefined;
  markdown?: CallidescopeMarkdownOutputConfiguration | undefined;
  /**
   * A markdown block whose call stacks are drawn rather than printed.
   *
   * Its own destination rather than a mode on `markdown`, so a repository can
   * publish both: the tree carries what each frame takes, returns, and
   * documents, and the diagram carries the shape they make together. Neither
   * one is the other with a flag flipped.
   */
  mermaid?: CallidescopeMarkdownOutputConfiguration | undefined;
  projectReadmes?: CallidescopeProjectReadmeConfiguration | undefined;
}

/** How a run renders what it found. */
export type CallidescopeOutputFormat = "json" | "markdown" | "mermaid";

/**
 * A section spliced into every traced project's own README.
 *
 * One destination rather than a list of paths: which files these are follows
 * from which projects were traced, and restating that in configuration would
 * only give it somewhere to drift from.
 */
export interface CallidescopeProjectReadmeConfiguration {
  endMarker?: string | undefined;
  /** Heading the section is written under. */
  heading?: string | undefined;
  /** Stacks shown before the rest fold into a disclosure. */
  previewCount?: number | undefined;
  startMarker?: string | undefined;
}

/** Arguments accepted by the configuration loader. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/** Splicing helpers handed to a configured `write` function. */
export interface MarkdownAnchorHelpers {
  endMarker: string;
  startMarker: string;
  /**
   * Splices the anchored block into a file, appending it when the markers are
   * absent, and creating the file when it does not exist.
   *
   * In check mode nothing is written and the return value reports whether the
   * file already holds the current block. Defaults to the rendered content and
   * the configured path; pass either to override.
   */
  syncAnchoredBlock: (overrides?: {
    content?: string | undefined;
    path?: string | undefined;
  }) => boolean;
  /** The content wrapped in the configured markers, ready to place anywhere. */
  wrapInAnchors: (content?: string) => string;
}

/** What a `render` function is handed. */
export interface RenderMarkdownArguments {
  /** The configured description, for a renderer that wants to place it itself. */
  description: string | undefined;
  /**
   * The built-in table rendering of these same findings.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderTables: () => string;
  result: CallGraphResult;
}

/** Turns the traced findings into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has to
 * know which fields a configuration file may omit.
 */
export interface ResolvedCallidescopeConfiguration {
  allowSpreadFor: string[];
  entryPoints: ResolvedCallidescopeEntryPoints;
  exclude: string[];
  excludeFrom: string[];
  limits: ResolvedCallidescopeLimits;
  output: ResolvedCallidescopeOutputConfiguration;
  projects: string[];
}

/** Entry-point rules with defaults applied. */
export interface ResolvedCallidescopeEntryPoints {
  decorators: string[];
  includeExportedFunctions: boolean;
  includeOrphans: boolean;
  includeTests: boolean;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCallidescopeJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/** Thresholds with defaults applied. */
export interface ResolvedCallidescopeLimits {
  callerMajorityRatio: number;
  directSpreadThreshold: number;
  maximumDepth: number;
  maximumImplementationFanOut: number;
  minimumCallers: number;
  spreadThreshold: number;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `write` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCallidescopeMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  path: string;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  write: undefined | WriteMarkdownOutput;
}

/**
 * Output destinations with defaults applied.
 *
 * Both stay `undefined` when unconfigured, which is the normal case: a run that
 * names no destination reports to the console and exits on violations, so
 * nothing it writes can go stale.
 */
export interface ResolvedCallidescopeOutputConfiguration {
  format: CallidescopeOutputFormat;
  json: ResolvedCallidescopeJsonOutputConfiguration | undefined;
  markdown: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
  mermaid: ResolvedCallidescopeMarkdownOutputConfiguration | undefined;
  projectReadmes: ResolvedCallidescopeProjectReadmeConfiguration | undefined;
}

/** Project README destination with defaults applied. */
export interface ResolvedCallidescopeProjectReadmeConfiguration {
  endMarker: string;
  heading: string;
  previewCount: number;
  startMarker: string;
}

/** What a `write` function is handed. */
export interface WriteMarkdownArguments {
  /** True when nothing may be written and staleness is the only question. */
  check: boolean;
  /** The rendered markdown, before any anchoring. */
  content: string;
  helpers: MarkdownAnchorHelpers;
  path: string | undefined;
  result: CallGraphResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
