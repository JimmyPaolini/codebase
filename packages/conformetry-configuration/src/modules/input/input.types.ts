// 🏷️ Types

import type { JsonSchemaDefinition } from "../configuration/configuration.types";
import type { PromptObject } from "prompts";

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName> | PromptObject<PromptName>[],
) => Promise<Record<PromptName, unknown>>;

/** Arguments for resolving generator inputs from raw CLI arguments. */
export interface ResolveGeneratorInputsArguments {
  /**
   * Whether to prompt for values the caller did not supply. Callers pass an
   * explicit boolean; there is no "unset means prompt" fallback, because that
   * is exactly how the CLI used to hang in non-interactive environments.
   */
  promptWhenMissing: boolean;
  rawArguments: string[];
  schema: JsonSchemaDefinition;
}

/** Arguments for resolving inputs from values the caller already has. */
export interface ResolveInputsFromValuesArguments {
  promptWhenMissing: boolean;
  providedInputs: Record<string, string | undefined>;
  schema: JsonSchemaDefinition;
}

/** One schema-backed input being resolved. */
export interface SchemaInput {
  readonly inputName: string;
  readonly isRequired: boolean;
  readonly propertySchema: unknown;
}
