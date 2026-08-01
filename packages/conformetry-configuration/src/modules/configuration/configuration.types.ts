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
  schemaPath: string;
  targetPathStrategy: string;
  templateDirectoryPath: string;
}

/**
 * Represents a hook that can run before or after generation.
 */
export interface ConformetryGeneratorHookDefinition {
  name: string;
}
