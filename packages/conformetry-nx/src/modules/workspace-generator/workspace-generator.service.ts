import { readNxJson, type Tree } from "@nx/devkit";

import { GenerationService } from "../generation/generation.service.js";
import { PluginOptionsService } from "../plugin-options/plugin-options.service.js";

import type { GeneratorCallback } from "@nx/devkit";

/**
 * Runs workspace generators backed by the shared conformetry configuration.
 */
export class WorkspaceGeneratorService {
  constructor(
    private readonly generationService: GenerationService,
    private readonly pluginOptionsService: PluginOptionsService,
  ) {}

  /**
   * Runs a workspace generator backed by the shared conformetry configuration.
   */
  public async runWorkspaceGenerator(args: {
    generatorName: string;
    options: Record<string, unknown> | undefined;
    tree: Tree;
  }): Promise<GeneratorCallback> {
    const nxJsonConfiguration = readNxJson(args.tree) ?? {};

    return await this.generationService.runConformetryGenerator({
      generatorName: args.generatorName,
      options: args.options ?? {},
      pluginOptions: this.pluginOptionsService.resolveConformetryNxPluginOptionsFromNxJson(
        {
          nxJsonConfiguration,
        },
      ),
      tree: args.tree,
    });
  }
}
