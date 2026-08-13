// 🏷️ Types

import type { JsonSchemaDefinition } from "../configuration/configuration.types";
import type { PromptObject } from "prompts";

/**
 * Function signature used to invoke interactive prompts.
 */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName> | PromptObject<PromptName>[],
) => Promise<Record<PromptName, unknown>>;

/**
 * Arguments used to resolve generator inputs from CLI values and prompts.
 */
export interface ResolveGeneratorInputsArguments {
  promptWhenMissing?: boolean;
  rawArguments: string[];
  schema: JsonSchemaDefinition;
}

/**
 * Arguments used to resolve schema-backed inputs from explicit values.
 */
export interface ResolveInputsFromValuesArguments {
  promptWhenMissing?: boolean;
  providedInputs: Record<string, string | undefined>;
  schema: JsonSchemaDefinition;
}
