/**
 * A plugin implementation that can validate one or more files.
 */
export interface ConformetryValidatorPlugin {
  descriptor: ValidatorPluginDescriptor;
  validate(args: ValidationPluginArguments): Promise<ValidationPluginResult>;
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
export interface ValidatorPluginDescriptor {
  description?: string;
  fileExtensions: string[];
  name: string;
}
