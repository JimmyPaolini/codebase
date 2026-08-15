import type { LoggerService } from "@codebase/logger";

// 🏷️ Types

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
