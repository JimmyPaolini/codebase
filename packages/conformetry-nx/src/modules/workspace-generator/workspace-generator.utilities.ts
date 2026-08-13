import { InputOptionsService } from "@jimmypaolini/conformetry-configuration";

import { CommandExecutionService } from "../command-execution/command-execution.service";
import { GenerationService } from "../generation/generation.service";
import { PluginOptionsService } from "../plugin-options/plugin-options.service";

import { WorkspaceGeneratorService } from "./workspace-generator.service";

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
      new InputOptionsService(),
      new PluginOptionsService(),
    ),
    new PluginOptionsService(),
  ).runWorkspaceGenerator(args);
}
