import { readNxJson } from "@nx/devkit";

import { runConformetryGenerator } from "../generation/generation.utilities";
import { resolveConformetryNxPluginOptionsFromNxJson } from "../plugin-options/plugin-options.utilities";

import type { GeneratorCallback, Tree } from "@nx/devkit";

/**
 * Runs a workspace generator backed by the shared conformetry configuration.
 */
export async function runWorkspaceGenerator(args: {
  generatorName: string;
  options: Record<string, unknown> | undefined;
  tree: Tree;
}): Promise<GeneratorCallback> {
  const nxJsonConfiguration = readNxJson(args.tree) ?? {};

  return await runConformetryGenerator({
    generatorName: args.generatorName,
    options: args.options ?? {},
    pluginOptions: resolveConformetryNxPluginOptionsFromNxJson({
      nxJsonConfiguration,
    }),
    tree: args.tree,
  });
}
