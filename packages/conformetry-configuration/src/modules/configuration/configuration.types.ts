// 🏷️ Types

import type { conformetryConfigurationSchema } from "./configuration.constants";
import type { z } from "zod";

/** The loaded generator registry. */
export interface ConformetryConfiguration {
  generators: Record<string, ConformetryGeneratorDefinition>;
}

/** One generator entry, after defaults have been resolved. */
export interface ConformetryGeneratorDefinition {
  aliases?: string[];
  description?: string;
  hooks?: ConformetryGeneratorHooks;
  name: string;
  parameters: Record<string, ConformetryGeneratorParameterDefinition>;
  /**
   * Where this generator's templates live, relative to the workspace root.
   * Taken from the config when set, otherwise derived from the registry key.
   */
  templateDirectoryPath: string;
}

/** A hook that runs before or after generation. */
export interface ConformetryGeneratorHookDefinition {
  name: string;
}

/**
 * Lifecycle hooks a generator can declare.
 *
 * Members are explicitly `| undefined` because the workspace enables
 * `exactOptionalPropertyTypes`, and Zod emits optional members that way.
 */
export interface ConformetryGeneratorHooks {
  postGenerate?: ConformetryGeneratorHookDefinition | undefined;
  preGenerate?: ConformetryGeneratorHookDefinition | undefined;
}

/** One configurable parameter, expressed as a JSON Schema fragment. */
export type ConformetryGeneratorParameterDefinition = Record<string, unknown>;

/** Shared plugin options for the Nx integration. */
export interface ConformetryNxPluginOptions {
  configFilePath?: string;
}

/**
 * Minimal JSON Schema fragment used to discover a generator's options.
 *
 * Only the parts conformetry actually reads are modelled — `properties` for
 * the option names, and `required` for which ones must be supplied.
 */
export interface JsonSchemaDefinition {
  [key: string]: unknown;
  properties?: Record<string, unknown>;
}

/** One generator entry exactly as Zod parsed it, before defaults are applied. */
export type ParsedGeneratorEntry = z.infer<
  typeof conformetryConfigurationSchema
>["generators"][string];
