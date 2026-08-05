/**
 * Describes a validator plugin for conformetry validations.
 */
export interface ConformetryValidatorPlugin {
  descriptor: ValidationPluginDescriptor;
  validate(args: ValidationPluginArguments): Promise<ValidationPluginResult>;
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
 * Arguments provided to an individual validator plugin.
 */
export interface ValidationPluginArguments {
  configurationPath?: string;
  filePaths: string[];
  templateRuleNames?: string[];
  workingDirectory: string;
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
 * Describes a validator plugin for conformetry validations.
 */
export interface ValidationPluginDescriptor {
  description?: string;
  fileExtensions: string[];
  name: string;
}

/**
 * Project metadata used to improve template matching and substitutions.
 */
export interface ValidationProjectTemplateMetadata {
  description?: string;
  generatorName?: string;
  type?: string;
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
 * Parsed project metadata fields used by template preparation.
 */
export interface ParsedProjectMetadata {
  sourceRoot?: string;
  tags?: string[];
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
