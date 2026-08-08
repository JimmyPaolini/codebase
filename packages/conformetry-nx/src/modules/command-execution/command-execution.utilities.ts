import { CommandExecutionService } from "./command-execution.service.js";

const commandExecutionService = new CommandExecutionService();

/**
 * Invokes GenerateCommand.run with deterministic arguments.
 */
export async function runGenerateCommand(args: {
  configurationPath: string;
  generatorName: string;
  passedParameters: string[];
  targetDirectoryPath: string;
}): Promise<void> {
  return await commandExecutionService.runGenerateCommand(args);
}
