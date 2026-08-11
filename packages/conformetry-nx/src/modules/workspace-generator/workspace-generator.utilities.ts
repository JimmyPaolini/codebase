import { CommandExecutionService } from "../command-execution/command-execution.service.js";
import { GenerationService } from "../generation/generation.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";

import { WorkspaceGeneratorService } from "./workspace-generator.service.js";

import type { GeneratorCallback, Tree } from "@nx/devkit";

/**
 * Runs a workspace generator backed by the shared conformetry configuration.
 */
export async function runWorkspaceGenerator(args: {
  generatorName: string;
  options: Record<string, unknown> | undefined;
  tree: Tree;
}): Promise<GeneratorCallback> {
  return await new WorkspaceGeneratorService(
    new GenerationService(
      new CommandExecutionService(),
      new PluginOptionsService(),
    ),
    new PluginOptionsService(),
  ).runWorkspaceGenerator(args);
}
