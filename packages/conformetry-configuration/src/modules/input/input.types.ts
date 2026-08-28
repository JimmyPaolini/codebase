// 🏷️ Types

import type { JsonSchemaDefinition } from "../configuration/configuration.types";
import type { PromptObject } from "prompts";

/** Signature used to invoke interactive prompts, injectable for testing. */
export type PromptRunner = <PromptName extends string>(
  promptRequest: PromptObject<PromptName> | PromptObject<PromptName>[],
) => Promise<Record<PromptName, unknown>>;

/** Arguments for resolving generator inputs from raw CLI arguments. */
export interface ResolveGeneratorInputsArguments {
  rawArguments: string[];
  schema: JsonSchemaDefinition;
}

/** Arguments for resolving inputs from values the caller already has. */
export interface ResolveInputsFromValuesArguments {
  providedInputs: Record<string, string | undefined>;
  schema: JsonSchemaDefinition;
}

/** One schema-backed input being resolved. */
export interface SchemaInput {
  readonly inputName: string;
  readonly isRequired: boolean;
  readonly propertySchema: unknown;
}
