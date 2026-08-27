// 🏷️ Types

import type { CallidescopeOutputFormat } from "../configuration/configuration.types";
import type { PromptObject } from "prompts";

/**
 * The `--format` option every callidescope command shares.
 *
 * Stated as its own interface so `resolveFormatOption` can be generic over a
 * command's whole options object and carry its other flags through unchanged.
 */
export interface CallidescopeFormatOptions {
  readonly format?: CallidescopeOutputFormat | undefined;
}

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName>,
) => Promise<Record<PromptName, unknown>>;
