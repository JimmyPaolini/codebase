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
  plugins: ConformetryValidatorPlugin[];
  projectPaths?: string[];
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
  filePaths: string[];
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
export interface ValidatorPluginDescriptor {
  description?: string;
  fileExtensions: string[];
  name: string;
}
