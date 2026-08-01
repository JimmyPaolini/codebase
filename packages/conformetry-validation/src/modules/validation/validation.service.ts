import type {
  RunValidationArguments,
  RunValidationResult,
  ValidationPluginArguments,
  ValidationPluginResult,
} from "./validation.types.js";

/**
 * Orchestrates validator plugin execution over selected project paths.
 */
export class ValidationService {
  /**
   * Runs a set of validator plugins against the requested project paths.
   */
  public async runValidation(
    args: RunValidationArguments,
  ): Promise<RunValidationResult> {
    const projectPaths = args.projectPaths?.length
      ? args.projectPaths
      : [args.workingDirectory];

    const pluginResults: ValidationPluginResult[] = [];

    for (const plugin of args.plugins) {
      const pluginArguments: ValidationPluginArguments = {
        filePaths: projectPaths,
        workingDirectory: args.workingDirectory,
      };

      const pluginResult = await plugin.validate(pluginArguments);
      pluginResults.push(pluginResult);
    }

    return {
      ok: pluginResults.every((pluginResult) => pluginResult.ok),
      pluginResults,
    };
  }
}
