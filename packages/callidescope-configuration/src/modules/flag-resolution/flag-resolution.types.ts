// 🏷️ Types

import type {
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
} from "../configuration/configuration.types";

/**
 * Every flag a callidescope command line may carry, as parsed and before any
 * of it has met a configuration.
 *
 * One shape for every command rather than one per command: `depth` accepts a
 * subset of what the workspace run accepts, and a subset is expressed by
 * leaving fields out rather than by a second type that would have to be kept
 * in step with this one.
 *
 * The mode flags are carried here even though resolution never merges them,
 * so the rule they obey is stated where the other flags' rules are rather
 * than left to be inferred from their absence.
 *
 * `--config` is deliberately absent: it chooses the file every other flag is
 * resolved against, so by the time resolution runs it has already done its
 * whole job.
 */
export interface CallidescopeRunFlags {
  /** Mode. The written `--check` set, or `true` for the flag with no value. */
  readonly check?: string | true | undefined;
  /** Scope. `--directories`, already split on commas. */
  readonly directories?: readonly string[] | undefined;
  /** Presentation. `--format`, exactly as it was typed. */
  readonly format?: string | undefined;
  /** Destination. `--json`, a path and nothing else. */
  readonly json?: string | undefined;
  /** Destination. `--markdown`, a path and nothing else. */
  readonly markdown?: string | undefined;
  /** Mode. `--write`. */
  readonly write?: boolean | undefined;
}

/** What a command line and the configuration it was resolved against produced. */
export interface ResolvedRunFlags {
  /**
   * The configuration every override has been applied to.
   *
   * The scope and the destinations a run acts on are read from here rather
   * than from the flags, so nothing downstream has to remember which of the
   * two won.
   */
  readonly configuration: ResolvedCallidescopeConfiguration;
  /**
   * Every reason the command line could not be resolved, collected rather
   * than thrown one at a time, so a command line with two mistakes in it is
   * two mistakes to fix rather than two runs.
   */
  readonly errors: readonly string[];
  /** What the run prints. The default whenever the flag was left off. */
  readonly format: CallidescopeOutputFormat;
}
