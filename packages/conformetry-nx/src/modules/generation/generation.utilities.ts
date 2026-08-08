import { CommandExecutionService } from "../command-execution/command-execution.service.js";
import { GenerationService } from "./generation.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";

const generationService = new GenerationService(
  new CommandExecutionService(),
  new PluginOptionsService(),
);

/**
 * Builds passed parameters for GenerateCommand.run from normalized options.
 */
export function buildGeneratePassedParameters(args: {
  generatorInputs: Record<string, string | undefined>;
  name: string;
  targetDirectoryPath: string;
}): string[] {
  return generationService.buildGeneratePassedParameters(args);
}

/**
 * Runs a conformetry generator via the conformetry GenerateCommand runtime.
 */
export async function runConformetryGenerator(args: {
  generatorName: string;
  options: Record<string, unknown>;
  pluginOptions?: Record<string, unknown>;
  tree: unknown;
}): Promise<unknown> {
  return await generationService.runConformetryGenerator(args as {
    generatorName: string;
    options: Record<string, unknown>;
    pluginOptions?: {
      configFilePath?: string;
      validationTargetName?: string;
    };
    tree: unknown;
  });
}
