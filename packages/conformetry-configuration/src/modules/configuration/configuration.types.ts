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
