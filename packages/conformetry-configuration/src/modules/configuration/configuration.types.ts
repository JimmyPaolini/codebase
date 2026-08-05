/**
 * Arguments for collecting generator inputs from raw command-line flags.
 */
export interface CollectGeneratorInputsFromCommandArgumentsArguments {
  rawArguments: string[];
  schema: JsonSchemaDefinition;
}

/**
 * Describes the loaded conformetry configuration registry.
 */
export interface ConformetryConfiguration {
  generators: Record<string, ConformetryGeneratorDefinition>;
}

/**
 * Describes a generator entry in the declarative registry.
 */
export interface ConformetryGeneratorDefinition {
  aliases?: string[];
  description?: string;
  hooks?: {
    postGenerate?: ConformetryGeneratorHookDefinition;
    preGenerate?: ConformetryGeneratorHookDefinition;
  };
  name: string;
  parameters: Record<string, ConformetryGeneratorParameterDefinition>;
  templateDirectoryPath: string;
}

/**
 * Represents a hook that can run before or after generation.
 */
export interface ConformetryGeneratorHookDefinition {
  name: string;
}

/**
 * Describes one configurable parameter for a generator.
 */
export interface ConformetryGeneratorParameterDefinition {
  description?: string;
  type: string;
}

/**
 * Shared plugin options for conformetry Nx integrations.
 */
export interface ConformetryNxPluginOptions {
  configFilePath?: string;
}

/**
 * Backward-compatible alias for shared conformetry plugin options.
 */
export type ConformetryPluginOptions = ConformetryNxPluginOptions;

/**
 * Minimal JSON schema fragment used to extract known generator options.
 */
export interface JsonSchemaDefinition {
  properties?: Record<string, unknown>;
}

/**
 * Parsed generator definition before derived runtime fields are added.
 */
export interface ParsedConformetryGeneratorDefinition {
  aliases?: string[];
  description?: string;
  hooks?: {
    postGenerate?: ConformetryGeneratorHookDefinition;
    preGenerate?: ConformetryGeneratorHookDefinition;
  };
  name: string;
  parameters: Record<string, ConformetryGeneratorParameterDefinition>;
}

/**
 * Arguments for resolving which configuration path should be used.
 */
export interface ResolveConfigurationPathArguments {
  defaultConfigurationPath?: string;
  options: Record<string, unknown>;
  pluginOptions?: ConformetryNxPluginOptions;
}

/**
 * Arguments used to resolve project root metadata.
 */
export interface ResolveProjectRootPathArguments {
  options: Record<string, unknown>;
  projectName: string;
}

/**
 * Arguments for resolving a target directory for generation.
 */
export interface ResolveTargetDirectoryPathArguments {
  defaultGeneratedOutputDirectory?: string;
  generatorName: string;
  options: Record<string, unknown>;
  resolveProjectRootPath?: (
    args: ResolveProjectRootPathArguments,
  ) => string | undefined;
}
