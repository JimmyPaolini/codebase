import path from "node:path";
import { pathToFileURL } from "node:url";

import { createConformetryGeneratorFactory } from "./modules/nx-adapter/nx-generator-factory";

import type { CreateNodes, GeneratorCallback, Tree } from "@nx/devkit";
export * from "./generators/init/generator";

export { resolveTemplateRuleRouting } from "./modules/rule-routing/rule-routing.service";

/**
 * Minimal conformetry configuration shape required by the Nx adapter.
 */
interface WorkspaceConformetryConfiguration {
  generators: Record<string, WorkspaceGeneratorDefinition>;
}

/**
 * Minimal generator configuration required by the Nx adapter.
 */
interface WorkspaceGeneratorDefinition {
  aliases?: string[];
  description?: string;
  name: string;
  schemaPath: string;
  targetPathStrategy: string;
  templateDirectoryPath: string;
}

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
 * Determines whether a value is a string-keyed object record.
 */
function isUnknownRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Validates the loaded conformetry configuration shape.
 */
function isWorkspaceConformetryConfiguration(
  value: unknown,
): value is WorkspaceConformetryConfiguration {
  if (!isUnknownRecord(value)) {
    return false;
  }

  if (!("generators" in value)) {
    return false;
  }

  return (
    typeof value["generators"] === "object" && value["generators"] !== null
  );
}

/**
 * Loads the conformetry configuration module from the current workspace.
 */
async function loadWorkspaceConformetryConfiguration(
  configurationPath: string,
): Promise<WorkspaceConformetryConfiguration> {
  const resolvedPath = path.isAbsolute(configurationPath)
    ? configurationPath
    : path.resolve(configurationPath);
  const importedModule: unknown = await import(
    pathToFileURL(resolvedPath).href
  );

  if (!isUnknownRecord(importedModule)) {
    throw new Error(
      `Invalid conformetry configuration module at "${resolvedPath}"`,
    );
  }

  const configurationValue =
    importedModule["default"] ?? importedModule["conformetryConfiguration"];

  if (!isWorkspaceConformetryConfiguration(configurationValue)) {
    throw new Error(
      `Invalid conformetry configuration at "${resolvedPath}": missing generators map`,
    );
  }

  return configurationValue;
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
  const configuration =
    await loadWorkspaceConformetryConfiguration(configurationPath);
  const generatorDefinition = configuration.generators[args.generatorName];

  if (generatorDefinition === undefined) {
    throw new Error(`Unknown conformetry generator "${args.generatorName}"`);
  }

  const factory = createConformetryGeneratorFactory({
    definition: {
      ...(generatorDefinition.aliases === undefined
        ? {}
        : { aliases: generatorDefinition.aliases }),
      ...(generatorDefinition.description === undefined
        ? {}
        : { description: generatorDefinition.description }),
      name: generatorDefinition.name,
      schemaPath: generatorDefinition.schemaPath,
      targetPathStrategy: generatorDefinition.targetPathStrategy,
      templateDirectoryPath: generatorDefinition.templateDirectoryPath,
    },
  });

  return await factory(args.tree, options);
}
