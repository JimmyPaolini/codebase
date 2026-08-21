import type { LoggerService } from "@codebase/logger";

// 🏷️ Types

/**
 * A synchronization command the aggregate `synchronization` command can drive.
 *
 * `synchronize` reports success rather than exiting so the aggregate can run
 * every command and report all drift at once. Exiting stays in each command's
 * own `run`, where it belongs.
 */
export interface SynchronizableCommand {
  /**
   * Which side of the pull-request line this synchronization sits on.
   *
   * Declared by the command itself rather than listed anywhere central, so a
   * new synchronization decides its own side once and every caller — the
   * aggregate command, the Nx target, the release workflow — reads it from
   * there.
   */
  readonly synchronizationKind: SynchronizationKind;
  readonly synchronizationLabel: string;
  synchronize(mode: SynchronizationMode): Promise<boolean>;
}

/** Options the aggregate `synchronization` command accepts. */
export interface SynchronizationCommandOptions {
  /**
   * The written `--kinds` set, or `true` for the flag passed without one.
   *
   * Kept as written rather than read into a set here, so the one place that
   * knows which kinds exist is the only place that decides what they mean.
   */
  readonly kinds?: string | true | undefined;
}

/**
 * What a synchronization derives, and therefore where its drift is answered.
 *
 * A derivation is checked on a pull request, because its source is
 * configuration the same change touched. A report is published on the default
 * branch, because its source is the code, and a branch being behind the
 * published report is not a mistake the branch made.
 */
export type SynchronizationKind = "derivation" | "report";

/**
 * The kinds a command line selected, and what it could not make sense of.
 *
 * Every complaint is collected before any of them is reported, so a command
 * line with two mistakes in it is two mistakes to fix rather than two runs.
 */
export interface SynchronizationKindSelection {
  readonly errors: readonly string[];
  readonly kinds: ReadonlySet<SynchronizationKind>;
}

/** Supported synchronization execution modes. */
export type SynchronizationMode = "check" | "write";

/** Shared options for resolving and validating synchronization command mode arguments. */
export interface SynchronizationModeResolutionOptions {
  readonly defaultMode?: SynchronizationMode;
  readonly invalidModeLabel: string;
  readonly loggerService: LoggerService;
  readonly passedParameters: string[];
  readonly usageMessage: string;
}

/** Result of mode parsing before command-specific error handling is applied. */
export type SynchronizationModeResolutionResult =
  | {
      modeValue: string;
      valid: false;
    }
  | {
      modeValue: SynchronizationMode;
      valid: true;
    };

/** Outcome of one command within an aggregate synchronization run. */
export interface SynchronizationResult {
  readonly label: string;
  readonly succeeded: boolean;
}
