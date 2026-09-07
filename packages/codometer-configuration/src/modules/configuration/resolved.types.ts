// 🏷️ Types

// What resolution produced, as opposed to what a configuration asked for.
// This half reads the authoring vocabulary and nothing reads it back, so the
// two sides cannot form a cycle — the same arrangement `statistics.types.ts`
// keeps for the measurement half.

import type {
  CodometerAnalysis,
  CodometerCompression,
  CodometerSeverity,
  CodometerSymbolKind,
  CodometerSymbolMatcher,
} from "./configuration.types";
import type { ResolvedCodometerOutputConfiguration } from "./output.types";
import type { CodometerStatisticGroup } from "./statistics.types";

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
 * Comment-length configuration with its severity filled in.
 *
 * Each maximum stays `undefined` when it was not declared. Nothing is
 * defaulted to a number: a budget nobody wrote is one nobody chose, and
 * inventing one here would gate every comment in the repository the moment a
 * `comments` key appeared.
 */
export interface ResolvedCodometerCommentsConfiguration {
  maximumCharacters: number | undefined;
  maximumLines: number | undefined;
  maximumWords: number | undefined;
  severity: CodometerSeverity;
}

/**
 * Configuration with every default applied.
 *
 * Consumers read this shape rather than the authored one, so no analyzer has
 * to know which fields a configuration file may omit.
 */
export interface ResolvedCodometerConfiguration {
  css: ResolvedCodometerLanguageConfiguration;
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
  hcl: ResolvedCodometerLanguageConfiguration;
  limits: ResolvedCodometerLimit[];
  output: ResolvedCodometerOutputConfiguration;
  python: ResolvedCodometerPythonConfiguration;
  shell: ResolvedCodometerLanguageConfiguration;
  sql: ResolvedCodometerLanguageConfiguration;
  statistics: ResolvedCodometerCustomStatistic[];
  targets: ResolvedCodometerTarget[];
  toml: ResolvedCodometerLanguageConfiguration;
  typescript: ResolvedCodometerLanguageConfiguration;
  yaml: ResolvedCodometerLanguageConfiguration;
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
export interface ResolvedCodometerDocumentationConfiguration extends ResolvedCodometerCommentsConfiguration {
  kinds: Partial<
    Record<CodometerSymbolKind, ResolvedCodometerCommentsConfiguration>
  >;
}

/** One language's configuration with every default applied. */
export interface ResolvedCodometerLanguageCommentsConfiguration extends ResolvedCodometerCommentsConfiguration {
  /**
   * Budgets over every comment in one file, or `undefined` when none were
   * written — which leaves the block budgets the only thing judged.
   */
  file: ResolvedCodometerCommentsConfiguration | undefined;
}

/** One language's configuration with every default applied. */
export interface ResolvedCodometerLanguageConfiguration {
  /**
   * Stays `undefined` when neither the language nor the top-level `comments`
   * default names a block, which is what leaves the check off rather than
   * gating every comment in the repository against a budget nobody chose.
   */
  comments: ResolvedCodometerLanguageCommentsConfiguration | undefined;
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
export interface ResolvedCodometerPythonConfiguration extends ResolvedCodometerLanguageConfiguration {
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
