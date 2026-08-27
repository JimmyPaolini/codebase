// 🏷️ Types

import type {
  CodometerOutputConfiguration,
  ResolvedCodometerOutputConfiguration,
} from "./output.types";
import type { CodometerStatisticGroup } from "./statistics.types";

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
  /**
   * Target a limit's metric path belongs to when it names none itself.
   *
   * A limit addresses its metric by target name followed by metric path.
   * Naming a default lets the target that dominates a repository's limits go
   * unwritten, leaving `typescript.interfaces` where every line would
   * otherwise repeat the same target name. A path that could be read either
   * way is rejected rather than resolved, so the shorthand can never bind
   * somewhere unintended.
   */
  defaultTarget?: string | undefined;
  /** How long a documented declaration's JSDoc comment may run, by kind. */
  documentation?: CodometerDocumentationConfiguration | undefined;
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
  /**
   * How high each measured metric may go.
   *
   * A metric nothing here names is measured and reported like every other one,
   * and gated by nothing.
   */
  limits?: CodometerLimit[] | undefined;
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
 * What a configuration file authored as a function is handed.
 *
 * Two absolute directories and nothing else. `directory` is what this run
 * measures and `configurationDirectory` is where the file deciding that sits,
 * which between them let one configuration serve every folder beneath it:
 * the difference of the two is the measured folder's position, and every path
 * convention a repository holds — where its build output lands, where a
 * package's manifest sits — is derivable from that position by the
 * configuration rather than being known by codometer.
 *
 * Nothing about the run's flags is here on purpose. A configuration that could
 * see whether the run writes or gates could describe a different repository to
 * each, and then no two runs would be measuring the same thing.
 */
export interface CodometerConfigurationContext {
  /**
   * Absolute directory holding the configuration file being loaded.
   *
   * The nearest ancestor carrying one, unless a path was named outright.
   */
  configurationDirectory: string;
  /** Absolute directory this run measures. */
  directory: string;
}

/**
 * A configuration file that decides what to say from where it is being run.
 *
 * The alternative to a static object, and the reason a workspace of twenty
 * near-identical projects needs one configuration file rather than twenty:
 * the convention is written once and each folder's targets and limits fall out
 * of its position. Returning a promise is allowed, so a factory may read a
 * manifest or an ignore file before answering.
 */
export type CodometerConfigurationFactory = (
  context: CodometerConfigurationContext,
) => CodometerConfiguration | Promise<CodometerConfiguration>;

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

/**
 * How high one documented declaration's JSDoc comment may run, by kind.
 *
 * Mirrors `CodometerLimit`: absolute, no baseline. `kinds` earns a class more
 * room than a property without forcing one repository-wide number to be either
 * loose enough to permit a property essay or tight enough to forbid a class
 * overview that should exist. A kind naming no entry in `kinds` falls back to
 * `default`.
 */
export interface CodometerDocumentationConfiguration {
  default?: number | undefined;
  kinds?: Partial<Record<CodometerSymbolKind, number>> | undefined;
  severity?: CodometerSeverity | undefined;
  unit?: CodometerDocumentationUnit | undefined;
}

/** Unit a documentation length is measured in. */
export type CodometerDocumentationUnit = "characters" | "lines" | "words";

/**
 * How high one measured metric may go.
 *
 * Limits are absolute: the metric is compared against `value` and nothing
 * else, with no baseline and no floor. A metric that stays under its limit is
 * reported the same way it would be without one.
 */
export interface CodometerLimit {
  /** What to call the limit in a report, when the path itself reads poorly. */
  label?: string | undefined;
  /**
   * The metric this limits, as a dotted path.
   *
   * Written as the target's name followed by the metric's path within it —
   * `codebase.typescript.interfaces`, `codebase.markdown.files`, or
   * `Compiled JavaScript.size`. With a `defaultTarget` configured, a path
   * naming no target is read as that target's. A path that resolves to more
   * than one metric, or to none, fails the run rather than binding to
   * whichever came first.
   */
  metric: string;
  /**
   * How loudly a breach is reported. Defaults to `fail`.
   *
   * Defaulted to the strict one on purpose: a limit exists to gate, and one
   * that quietly warned because nobody said otherwise would be a gate in name
   * only.
   */
  severity?: CodometerSeverity | undefined;
  /**
   * How high the metric may go, as a number or a string carrying a unit.
   *
   * Units are decimal and their trailing `b` is required: `"8 KB"` is 8000 and
   * `"1 MB"` is 1000000, while `"8 K"` is not a size and is rejected. A value
   * nothing can read fails the run rather than being taken as zero, which
   * would gate every metric at nothing.
   */
  value: number | string;
}

/** How Python sources are analyzed. */
export interface CodometerPythonConfiguration {
  command?: string | undefined;
}

/**
 * What a breach costs.
 *
 * `fail` is a gate and `warn` is a report — the difference between a limit
 * that stops a change and one that only says the metric passed it. Both are
 * reported identically; only the consequence differs.
 */
export type CodometerSeverity = "fail" | "warn";

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
 * Globs are relative to `directory`, and a leading `!` on an include glob
 * excludes instead of including. Negations are collected rather than applied
 * in order, so moving one within the array cannot change which files the
 * target holds.
 *
 * Ignore files are not consulted. A target names its files outright, which is
 * what lets one measure compiled output — a directory `.gitignore` claims, and
 * therefore the one place ignore rules must not reach.
 */
export interface CodometerTarget {
  /** Which analyses run over the matched files. At least one. */
  analyses: CodometerAnalysis[];
  compression?: CodometerCompression | undefined;
  /**
   * Where the target's globs start, relative to the measured directory.
   *
   * Defaults to the measured directory itself. A repository that builds into
   * one tree while measuring a project in another names the way out here —
   * `"../.."` for a project two levels down from a workspace-level `dist` —
   * so that codometer never has to know a build output convention to find the
   * files a target claims.
   */
  directory?: string | undefined;
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
 * A resolved configuration and the file it was resolved from.
 *
 * `path` stays `undefined` when the upward walk reached the filesystem root
 * without finding a file, which is legal and leaves every default in place.
 */
export interface LoadedConfiguration {
  configuration: ResolvedCodometerConfiguration;
  path: string | undefined;
}

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has
 * to know which fields a configuration file may omit.
 */
export interface ResolvedCodometerConfiguration {
  /** Stays `undefined` when nothing named one, so every path must qualify. */
  defaultTarget: string | undefined;
  /**
   * Stays `undefined` when a configuration names no `documentation` block at
   * all, which is what leaves the check off rather than gating every
   * documented declaration against a default nobody chose.
   */
  documentation: ResolvedCodometerDocumentationConfiguration | undefined;
  exclude: string[];
  excludeFrom: string[];
  limits: ResolvedCodometerLimit[];
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

/** Documentation-length configuration with every default applied. */
export interface ResolvedCodometerDocumentationConfiguration {
  default: number;
  kinds: Partial<Record<CodometerSymbolKind, number>>;
  severity: CodometerSeverity;
  unit: CodometerDocumentationUnit;
}

/**
 * A limit with its severity filled in and its value read as a number.
 *
 * The unit is gone by this point: a limit written `"8 KB"` arrives here as
 * 8000, so nothing downstream has to know that limits can be written with
 * units at all.
 */
export interface ResolvedCodometerLimit {
  /** Stays `undefined` when none was written; a report falls back to the path. */
  label: string | undefined;
  metric: string;
  severity: CodometerSeverity;
  value: number;
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
  /** `"."` when the target never named one, meaning the measured directory. */
  directory: string;
  exclude: string[];
  include: string[];
  name: string;
}
