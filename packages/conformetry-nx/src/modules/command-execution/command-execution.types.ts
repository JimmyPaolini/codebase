// 🏷️ Types

/**
 * Arguments required to invoke GenerateCommand.run from Nx wrappers.
 */
export interface RunGenerateCommandArguments {
  configurationPath: string;
  generatorName: string;
  passedParameters: string[];
  targetDirectoryPath: string;
}
