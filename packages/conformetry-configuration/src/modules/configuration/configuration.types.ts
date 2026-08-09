/**
 * Arguments for collecting generator inputs from raw command-line flags.
 */
export interface CollectGeneratorInputsFromCommandArgumentsArguments {
  rawArguments: string[];
  schema: JsonSchemaDefinition;
}

/**
 * Ranking inputs for candidate comparison.
 */
export interface CompareMatchedCandidatesArguments {
  inferredGeneratorNames: Set<string>;
  leftCandidate: MatchedGeneratorCandidate;
  projectTemplateMetadata: ValidationProjectTemplateMetadata;
  rightCandidate: MatchedGeneratorCandidate;
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
export type ConformetryGeneratorParameterDefinition = Record<string, unknown>;

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
 * Describes a validator plugin for conformetry validations.
 */
export interface ConformetryValidatorPlugin {
  descriptor: ValidationPluginDescriptor;
  validate(args: ValidationPluginArguments): Promise<ValidationPluginResult>;
}

/**
 * Minimal JSON schema fragment used to extract known generator options.
 */
export interface JsonSchemaDefinition {
  [key: string]: unknown;
  properties?: Record<string, unknown>;
}

/**
 * Candidate template metadata for one generator.
 */
export interface MatchedGeneratorCandidate {
  absoluteTemplateDirectoryPath: string;
  existingFileCount: number;
  generatorName: string;
  substitutions: Record<string, string>;
  templateFilePaths: string[];
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
  parameters?: Record<string, ConformetryGeneratorParameterDefinition>;
}

/**
 * Parsed project metadata fields used by template preparation.
 */
export interface ParsedProjectMetadata {
  sourceRoot?: string;
  tags?: string[];
}

/**
 * Prepared template-instance document pair for language validation.
 */
export interface PreparedValidationDocument {
  filename: string;
  instance: string;
  instanceFilePath: string;
  renderedTemplate: string;
  templateFilePath: string;
}

/**
 * Prepared payload containing all documents and discovery-time violations.
 */
export interface PreparedValidationPayload {
  checkedPaths: string[];
  documents: PreparedValidationDocument[];
  violations: string[];
}

/**
 * Arguments accepted by template validation preparation.
 */
export interface PrepareTemplateValidationPayloadArguments {
  configurationPath: string;
  fileExtensions: string[];
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
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

/**
 * Arguments accepted by the validation orchestration runner.
 */
export interface RunValidationArguments {
  configurationPath?: string;
  plugins: ConformetryValidatorPlugin[];
  projectPaths?: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
}

/**
 * Result returned by the validation orchestration runner.
 */
export interface RunValidationResult {
  ok: boolean;
  pluginResults: ValidationPluginResult[];
}

/**
 * Arguments provided to an individual validator plugin.
 */
export interface ValidationPluginArguments {
  configurationPath?: string;
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
}

/**
 * Describes a validator plugin for conformetry validations.
 */
export interface ValidationPluginDescriptor {
  description?: string;
  fileExtensions: string[];
  name: string;
}

/**
 * Result returned by a validator plugin.
 */
export interface ValidationPluginResult {
  checkedPaths: string[];
  ok: boolean;
  pluginName: string;
  violations: string[];
}

/**
 * Project metadata used to improve template matching and substitutions.
 */
export interface ValidationProjectTemplateMetadata {
  description?: string;
  generatorName?: string;
  type?: string;
}
