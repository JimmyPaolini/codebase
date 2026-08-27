// 🏷️ Types

import type { CODEPENDIX_RUN_MODES } from "./input.constants";
import type { PromptObject } from "prompts";

/** Which of the two run modes a command line resolved to. */
export type CodependixRunMode = (typeof CODEPENDIX_RUN_MODES)[number];

/**
 * The run-mode flags every codependix command line carries.
 *
 * Stated as the minimum `InputService.resolveOptions` reads rather than as a
 * whole command's options, so the service stays ignorant of the flags a
 * particular command adds around them.
 */
export interface CodependixRunModeOptions {
  check?: boolean | undefined;
  write?: boolean | undefined;
}

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName>,
) => Promise<Record<PromptName, unknown>>;
