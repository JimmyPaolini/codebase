import fs from "node:fs";
import path from "node:path";

import { resolveConformetryNxPluginOptions } from "./modules/plugin-options/plugin-options.utilities.js";
import { RuleRoutingService } from "./modules/rule-routing/rule-routing.service.js";
import { buildInferredValidationTarget } from "./modules/validation-target/validation-target.utilities.js";
import { runWorkspaceGenerator } from "./modules/workspace-generator/workspace-generator.utilities.js";
export { MainModule } from "./main.module.js";

import type {
  ResolveTemplateRuleRoutingArguments,
  ResolveTemplateRuleRoutingResult,
} from "./modules/rule-routing/rule-routing.types.js";
import type {
  CreateNodes,
  CreateNodesContext,
  CreateNodesResultArray,
  GeneratorCallback,
  Tree,
} from "@nx/devkit";

/**
 * A minimal Nx plugin entrypoint so the package can be discovered by Nx.
 */
const createNodes: CreateNodes = [
  "**/project.json",
  (
    projectConfigurationFiles: readonly string[],
    options: unknown,
    context: CreateNodesContext,
  ): CreateNodesResultArray => {
    const pluginOptions = resolveConformetryNxPluginOptions(options);
    const createNodesResults: CreateNodesResultArray = [];

    for (const projectConfigurationFile of projectConfigurationFiles) {
      const absoluteProjectConfigurationFilePath = path.resolve(
        context.workspaceRoot,
        projectConfigurationFile,
      );
      const rawProjectConfiguration = JSON.parse(
        fs.readFileSync(absoluteProjectConfigurationFilePath, "utf8"),
      ) as { tags?: string[] };
      const inferredTargets = buildInferredValidationTarget({
        pluginOptions,
        projectRoot: path.dirname(projectConfigurationFile),
        projectTags: rawProjectConfiguration.tags ?? [],
      });

      if (inferredTargets === undefined) {
        continue;
      }

      const projectRoot = path.dirname(projectConfigurationFile);
      createNodesResults.push([
        projectConfigurationFile,
        {
          projects: {
            [projectRoot]: {
              targets: inferredTargets,
            },
          },
        },
      ]);
    }

    return createNodesResults;
  },
];

const conformetryPluginDefinition = {
  createNodes,
  name: "@jimmypaolini/conformetry-nx",
};

export default conformetryPluginDefinition;

/**
 * Executes the jupyter-notebook-application generator.
 */
export async function generateJupyterNotebookApplication(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "jupyter-notebook-application",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-command-project generator.
 */
export async function generateNestjsCommandApplication(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-command-project",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-command-module generator.
 */
export async function generateNestjsCommandModule(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-command-module",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-dataloader-module generator.
 */
export async function generateNestjsDataloaderModule(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-dataloader-module",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-graphql-application generator.
 */
export async function generateNestjsGraphqlApplication(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-graphql-application",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-graphql-module generator.
 */
export async function generateNestjsGraphqlModule(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-graphql-module",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-service-file generator.
 */
export async function generateNestjsServiceFile(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-service-file",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-service-module generator.
 */
export async function generateNestjsServiceModule(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-service-module",
    options,
    tree,
  });
}

/**
 * Executes the nestjs-service-project generator.
 */
export async function generateNestjsServicePackage(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-service-project",
    options,
    tree,
  });
}

/**
 * Executes the react-component generator.
 */
export async function generateReactComponent(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "react-component",
    options,
    tree,
  });
}

/**
 * Resolves template rule routing for the Nx plugin.
 */
export async function resolveTemplateRuleRouting(
  args: ResolveTemplateRuleRoutingArguments,
): Promise<ResolveTemplateRuleRoutingResult> {
  const ruleRoutingService = new RuleRoutingService();
  await Promise.resolve();

  return ruleRoutingService.resolveTemplateRuleRouting(args);
}
