import { CommandExecutionService } from "../command-execution/command-execution.service.js";
import { GenerationService } from "../generation/generation.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";
import { WorkspaceGeneratorService } from "./workspace-generator.service.js";

const workspaceGeneratorService = new WorkspaceGeneratorService(
  new GenerationService(
    new CommandExecutionService(),
    new PluginOptionsService(),
  ),
  new PluginOptionsService(),
);

/**
 * Runs a workspace generator backed by the shared conformetry configuration.
 */
export async function runWorkspaceGenerator(args: {
  generatorName: string;
  options: Record<string, unknown> | undefined;
  tree: unknown;
}): Promise<unknown> {
  return await workspaceGeneratorService.runWorkspaceGenerator(args as {
    generatorName: string;
    options: Record<string, unknown> | undefined;
    tree: unknown;
  });
}
