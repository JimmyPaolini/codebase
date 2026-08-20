// 🏷️ Types

import type {
  CodeStatisticsResult,
  CodometerStatisticGroup,
} from "./statistics.types";

/**
 * An analysis codometer can run over a target.
 *
 * `language` parses the matched files and counts what they declare; `size`
 * compresses them and counts bytes. Which of them a target runs is the only
 * thing separating a source tree from build output.
 */
export type CodometerAnalysis = "language" | "size";

/**
 * How a target's files are compressed before size analysis counts them.
 *
 * `none` reports the bytes on disk. Named explicitly rather than inferred from
 * which options are absent, because a compression nobody chose is a byte count
 * nobody can explain.
 */
export type CodometerCompression = "brotli" | "gzip" | "none";

/**
 * Configuration authored in a `codometer.config.ts` file.
 *
 * Every field is optional. A repository with no configuration file at all is
 * still measurable, which is what keeps the tool usable before anyone has
 * decided what their exclusions or output destinations should be.
 */
export interface CodometerConfiguration {
  exclude?: string[] | undefined;
  /**
   * Ignore files, in gitignore syntax, whose patterns also exclude files.
   *
   * For the committed-but-generated files no glob list should have to restate —
   * lockfiles, vendored bundles, anything a repository already tells its other
   * tools to skip. Files the repository's own `.gitignore` claims need no
   * mention at all: discovery reads those files itself.
   */
  excludeFrom?: string[] | undefined;
  output?: CodometerOutputConfiguration | undefined;
  python?: CodometerPythonConfiguration | undefined;
  /**
   * Counters for the conventions a repository holds itself to.
   *
   * A repository that suffixes its files — `*.service.ts`, `*.unit.test.ts` —
   * or forbids a construct outright has a vocabulary no language analyzer
   * knows about, and counting it is the difference between "1015 TypeScript
   * files" and "how much of this is services, and how much is the tests for
   * them".
   */
  statistics?: CodometerCustomStatistic[] | undefined;
  /**
   * Named sets of files measured alongside the codebase itself.
   *
   * Everything the repository holds is measured without one — a target is how
   * a repository names a *part* of itself, most often compiled output, which
   * its ignore files keep out of the codebase measurement on purpose.
   */
  targets?: CodometerTarget[] | undefined;
}

/**
 * One configured counter.
 *
 * A counter measures one of two things. With `patterns` alone it counts
 * *files* whose repository-relative path matches at least one glob. With
 * `symbols` it counts *declarations* in TypeScript and JavaScript sources
 * matching the AST criteria, and `patterns` then narrows which files are
 * searched rather than being what is counted.
 *
 * Either way a match is counted once, however many patterns claim it.
 */
export interface CodometerCustomStatistic {
  /** Badge color, as a shields.io hexadecimal triplet. */
  color?: string | undefined;
  /**
   * Which badge group the counter is rendered into.
   *
   * Defaults to `conventions`, the group that exists for these counters and
   * is omitted entirely when none are configured. Naming a language group
   * instead puts the badge beside the built-in counters it belongs with.
   */
  group?: CodometerStatisticGroup | undefined;
  label: string;
  patterns?: string[] | undefined;
  symbols?: CodometerSymbolMatcher | undefined;
}

/** Where and how the JSON statistics report is written. */
export interface CodometerJsonOutputConfiguration {
  indentation?: number | undefined;
  path: string;
}

/**
 * Where and how the markdown report is written.
 *
 * `render` and `write` are the two halves of the built-in behavior, each
 * replaceable on its own: `render` turns the statistics into markdown, and
 * `write` decides which file that markdown lands in and how. Supplying only
 * one keeps the built-in other half.
 *
 * `path` is optional because a `write` function may choose the file itself —
 * but one of the two must be present, or there is no markdown output at all.
 */
export interface CodometerMarkdownOutputConfiguration {
  description?: string | undefined;
  endMarker?: string | undefined;
  path?: string | undefined;
  render?: RenderMarkdownOutput | undefined;
  startMarker?: string | undefined;
  write?: undefined | WriteMarkdownOutput;
}

/** Destinations the measured statistics are written to. */
export interface CodometerOutputConfiguration {
  json?: CodometerJsonOutputConfiguration | undefined;
  markdown?: CodometerMarkdownOutputConfiguration | undefined;
}

/** How Python sources are analyzed. */
export interface CodometerPythonConfiguration {
  command?: string | undefined;
}

/**
 * A kind of declaration a symbol counter can ask for.
 *
 * `function` covers every callable written outside a class body — function
 * declarations, function expressions, and arrow functions alike — while a
 * callable written as a class member is a `method`, a `getter`, or a
 * `setter`. A class field holding an arrow function is a `property`: the
 * arrow carries none of the field's modifiers, so a static one is found by
 * asking for static properties rather than static methods.
 */
export type CodometerSymbolKind =
  | "class"
  | "enum"
  | "function"
  | "getter"
  | "interface"
  | "method"
  | "property"
  | "setter";

/**
 * Which TypeScript and JavaScript declarations a counter claims.
 *
 * A declaration counts when its kind is one of `kinds` and it carries every
 * modifier in `modifiers`. An empty or absent `modifiers` asks for the kind
 * alone.
 */
export interface CodometerSymbolMatcher {
  kinds: CodometerSymbolKind[];
  modifiers?: CodometerSymbolModifier[] | undefined;
}

/**
 * A modifier a counted declaration must carry.
 *
 * Read literally, from the syntax: `public` matches members annotated
 * `public` and not members that are public by omission, and `private`
 * likewise does not match a `#name` field, which carries no modifier.
 */
export type CodometerSymbolModifier =
  | "abstract"
  | "async"
  | "export"
  | "override"
  | "private"
  | "protected"
  | "public"
  | "readonly"
  | "static";

/**
 * A named set of files, declared by include and exclude globs.
 *
 * Globs are relative to the measured directory, and a leading `!` on an
 * include glob excludes instead of including. Negations are collected rather
 * than applied in order, so moving one within the array cannot change which
 * files the target holds.
 *
 * Ignore files are not consulted. A target names its files outright, which is
 * what lets one measure compiled output — a directory `.gitignore` claims, and
 * therefore the one place ignore rules must not reach.
 */
export interface CodometerTarget {
  /** Which analyses run over the matched files. At least one. */
  analyses: CodometerAnalysis[];
  compression?: CodometerCompression | undefined;
  exclude?: string[] | undefined;
  include: string[];
  name: string;
}

/** Arguments accepted when loading a configuration file. */
export interface LoadConfigurationArguments {
  configurationPath?: string | undefined;
  searchDirectory?: string | undefined;
}

/**
 * The anchor mechanics a `write` function would otherwise have to reimplement.
 *
 * Splicing a generated block between two HTML comments is the common case, so
 * it is one call away even for a writer that picks its own file.
 */
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
   * The built-in badge rendering of these same statistics.
   *
   * Call it to add to the default report rather than replace it.
   */
  renderBadges: () => string;
  statistics: CodeStatisticsResult;
}

/** Turns the measured statistics into the markdown that will be written. */
export type RenderMarkdownOutput = (args: RenderMarkdownArguments) => string;

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has
 * to know which fields a configuration file may omit.
 */
export interface ResolvedCodometerConfiguration {
  exclude: string[];
  excludeFrom: string[];
  output: ResolvedCodometerOutputConfiguration;
  python: ResolvedCodometerPythonConfiguration;
  statistics: ResolvedCodometerCustomStatistic[];
  targets: ResolvedCodometerTarget[];
}

/** A configured counter with its badge color and group filled in. */
export interface ResolvedCodometerCustomStatistic {
  color: string;
  group: CodometerStatisticGroup;
  label: string;
  /** Empty for a symbol counter naming none, which then searches every file. */
  patterns: string[];
  symbols?: CodometerSymbolMatcher | undefined;
}

/** JSON output destination with defaults applied. */
export interface ResolvedCodometerJsonOutputConfiguration {
  indentation: number;
  path: string;
}

/**
 * Markdown output destination with defaults applied.
 *
 * `render` and `write` stay `undefined` when the configuration supplies
 * neither: the built-in implementations live in the CLI that calls them, so
 * "unset" is what selects them rather than a default named here.
 */
export interface ResolvedCodometerMarkdownOutputConfiguration {
  description: string | undefined;
  endMarker: string;
  path: string | undefined;
  render: RenderMarkdownOutput | undefined;
  startMarker: string;
  write: undefined | WriteMarkdownOutput;
}

/**
 * Output destinations with defaults applied.
 *
 * A destination stays `undefined` when nothing named it. Absent means "do not
 * write this file", which is a different instruction from a default path
 * nobody asked for.
 */
export interface ResolvedCodometerOutputConfiguration {
  json: ResolvedCodometerJsonOutputConfiguration | undefined;
  markdown: ResolvedCodometerMarkdownOutputConfiguration | undefined;
}

/** Python analysis settings with defaults applied. */
export interface ResolvedCodometerPythonConfiguration {
  command: string;
}

/**
 * A target with its compression filled in and its negations collected.
 *
 * `include` holds only patterns that add files and `exclude` only patterns
 * that remove them, whichever list they were authored in. Order carries no
 * meaning in either: a file is in the target when some include glob claims it
 * and no exclude glob does.
 */
export interface ResolvedCodometerTarget {
  analyses: CodometerAnalysis[];
  compression: CodometerCompression;
  exclude: string[];
  include: string[];
  name: string;
}

/** What a `write` function is handed. */
export interface WriteMarkdownArguments {
  anchors: MarkdownAnchorHelpers;
  /** True when nothing may be written and the file is only being inspected. */
  check: boolean;
  /** The markdown produced by the render step. */
  content: string;
  /** The configured path, resolved against the measured directory. */
  path: string | undefined;
  statistics: CodeStatisticsResult;
}

/**
 * Decides which file the rendered markdown lands in, and how.
 *
 * Return `false` to report the destination as stale — in check mode that is
 * what fails the command. Anything else counts as up to date.
 */
export type WriteMarkdownOutput = (args: WriteMarkdownArguments) => boolean;
