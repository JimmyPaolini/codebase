import type { LoggerService } from "../logger/logger.service";

// 🏷️ Types

/**
 * A synchronization command the aggregate `synchronization` command can drive.
 *
 * `synchronize` reports success rather than exiting so the aggregate can run
 * every command and report all drift at once. Exiting stays in each command's
 * own `run`, where it belongs.
 */
export interface SynchronizableCommand {
  readonly synchronizationLabel: string;
  synchronize(mode: SynchronizationMode): Promise<boolean>;
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
