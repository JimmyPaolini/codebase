import { NestFactory } from "@nestjs/core";

import { NxAdapterService } from "./modules/nx-adapter/nx-adapter.service";
import { RuleRoutingService } from "./modules/rule-routing/rule-routing.service";

import type {
  ResolveTemplateRuleRoutingArguments,
  ResolveTemplateRuleRoutingResult,
} from "./modules/rule-routing/rule-routing.types";
import type { CreateNodes, GeneratorCallback, Tree } from "@nx/devkit";

/**
 * A minimal Nx plugin entrypoint so the package can be discovered by Nx.
 */
const createNodes: CreateNodes = [
  "**/package.json",
  (): never[] => {
    return [];
  },
];

const conformetryPluginDefinition = {
  createNodes,
  name: "@jimmypaolini/conformetry-nx",
};

const noopGeneratorCallback: GeneratorCallback = async (): Promise<void> => {};

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
 * Executes the nestjs-command-application generator.
 */
export async function generateNestjsCommandApplication(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-command-application",
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
 * Executes the nestjs-service-package generator.
 */
export async function generateNestjsServicePackage(
  tree: Tree,
  options?: Record<string, unknown>,
): Promise<GeneratorCallback> {
  return await runWorkspaceGenerator({
    generatorName: "nestjs-service-package",
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

/** Resolves template rule routing for the Nx plugin. */
export async function resolveTemplateRuleRouting(
  args: ResolveTemplateRuleRoutingArguments,
): Promise<ResolveTemplateRuleRoutingResult> {
  const ruleRoutingService = new RuleRoutingService();
  await Promise.resolve();

  return ruleRoutingService.resolveTemplateRuleRouting(args);
}

/**
 * Runs a workspace generator backed by the shared conformetry configuration.
 */
async function runWorkspaceGenerator(args: {
  generatorName: string;
  options: Record<string, unknown> | undefined;
  tree: Tree;
}): Promise<GeneratorCallback> {
  const options = args.options ?? {};
  const configurationPath =
    typeof options["config"] === "string"
      ? options["config"]
      : "configuration/conformetry.config.ts";

  const nxAdapterService = new NxAdapterService();
  const targetDirectoryPath =
    await nxAdapterService.resolveConformetryTargetDirectoryPath({
      definition: {
        name: args.generatorName,
        templateDirectoryPath: "configuration/conformetry-templates",
      },
      options,
      tree: args.tree,
    });
  const generatorInputs = nxAdapterService.normalizeGeneratorInputs(options);
  const { GenerateCommand, MainModule } =
    await import("@jimmypaolini/conformetry");

  const applicationContext = await NestFactory.createApplicationContext(
    MainModule,
    {
      logger: false,
    },
  );

  try {
    const generateCommand = applicationContext.get(GenerateCommand);
    await generateCommand.runConfiguredGeneration({
      configurationPath,
      generatorInputs,
      generatorName: args.generatorName,
      targetDirectoryPath,
    });
  } finally {
    await applicationContext.close();
  }

  return noopGeneratorCallback;
}
