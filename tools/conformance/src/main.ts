import path from "node:path";
import { fileURLToPath } from "node:url";

import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module";
import { JupyterNotebookApplicationCommand } from "./modules/jupyter-notebook-application/jupyter-notebook-application.command";
import { NestjsCommandApplicationCommand } from "./modules/nestjs-command-application/nestjs-command-application.command";
import { NestjsCommandModuleCommand } from "./modules/nestjs-command-module/nestjs-command-module.command";
import { NestjsDataloaderModuleCommand } from "./modules/nestjs-dataloader-module/nestjs-dataloader-module.command";
import { NestjsGraphqlApplicationCommand } from "./modules/nestjs-graphql-application/nestjs-graphql-application.command";
import { NestjsGraphqlModuleCommand } from "./modules/nestjs-graphql-module/nestjs-graphql-module.command";
import { NestjsServiceFileCommand } from "./modules/nestjs-service-file/nestjs-service-file.command";
import { NestjsServiceModuleCommand } from "./modules/nestjs-service-module/nestjs-service-module.command";
import { ReactComponentCommand } from "./modules/react-component/react-component.command";
import { buildCommandFactoryRunOptions } from "./utilities";

import type { JupyterNotebookApplicationOptions } from "./modules/jupyter-notebook-application/jupyter-notebook-application.types";
import type { NestjsCommandApplicationOptions } from "./modules/nestjs-command-application/nestjs-command-application.types";
import type { NestjsCommandModuleOptions } from "./modules/nestjs-command-module/nestjs-command-module.types";
import type { NestjsDataloaderModuleOptions } from "./modules/nestjs-dataloader-module/nestjs-dataloader-module.types";
import type { NestjsGraphqlApplicationOptions } from "./modules/nestjs-graphql-application/nestjs-graphql-application.types";
import type { NestjsGraphqlModuleOptions } from "./modules/nestjs-graphql-module/nestjs-graphql-module.types";
import type { NestjsServiceFileOptions } from "./modules/nestjs-service-file/nestjs-service-file.types";
import type { NestjsServiceModuleOptions } from "./modules/nestjs-service-module/nestjs-service-module.types";
import type { ReactComponentOptions } from "./modules/react-component/react-component.types";
import type { GeneratorCallback, Tree } from "@nx/devkit";

/**
 * Generates an instance of the Jupyter notebook application template.
 */
export async function generateJupyterNotebookApplication(
  _tree: Tree,
  options: JupyterNotebookApplicationOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const jupyterNotebookApplicationCommand = application.get(
      JupyterNotebookApplicationCommand,
    );

    await jupyterNotebookApplicationCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS command application template.
 */
export async function generateNestjsCommandApplication(
  _tree: Tree,
  options: NestjsCommandApplicationOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsCommandApplicationCommand = application.get(
      NestjsCommandApplicationCommand,
    );

    await nestjsCommandApplicationCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS command module template.
 */
export async function generateNestjsCommandModule(
  _tree: Tree,
  options: NestjsCommandModuleOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsCommandModuleCommand = application.get(
      NestjsCommandModuleCommand,
    );

    await nestjsCommandModuleCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS DataLoader module template.
 */
export async function generateNestjsDataloaderModule(
  _tree: Tree,
  options: NestjsDataloaderModuleOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsDataloaderModuleCommand = application.get(
      NestjsDataloaderModuleCommand,
    );

    await nestjsDataloaderModuleCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS GraphQL application template.
 */
export async function generateNestjsGraphqlApplication(
  _tree: Tree,
  options: NestjsGraphqlApplicationOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsGraphqlApplicationCommand = application.get(
      NestjsGraphqlApplicationCommand,
    );

    await nestjsGraphqlApplicationCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS GraphQL module template.
 */
export async function generateNestjsGraphqlModule(
  _tree: Tree,
  options: NestjsGraphqlModuleOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsGraphqlModuleCommand = application.get(
      NestjsGraphqlModuleCommand,
    );

    await nestjsGraphqlModuleCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS service file template.
 */
export async function generateNestjsServiceFile(
  _tree: Tree,
  options: NestjsServiceFileOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsServiceFileCommand = application.get(NestjsServiceFileCommand);

    await nestjsServiceFileCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the NestJS service module template.
 */
export async function generateNestjsServiceModule(
  _tree: Tree,
  options: NestjsServiceModuleOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const nestjsServiceModuleCommand = application.get(
      NestjsServiceModuleCommand,
    );

    await nestjsServiceModuleCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Generates an instance of the React component template.
 */
export async function generateReactComponent(
  _tree: Tree,
  options: ReactComponentOptions = {},
): Promise<GeneratorCallback> {
  const application = await CommandFactory.createWithoutRunning(
    MainModule,
    buildCommandFactoryRunOptions(),
  );

  try {
    const reactComponentCommand = application.get(ReactComponentCommand);

    await reactComponentCommand.run([], options);
  } finally {
    await application.close();
  }

  return async (): Promise<void> => {};
}

/**
 * Entry point for the conformance validation process.
 */
async function main(): Promise<void> {
  const invokedFilePath = process.argv[1];
  if (invokedFilePath === undefined) {
    return;
  }

  const currentFilePath = fileURLToPath(import.meta.url);
  if (path.resolve(invokedFilePath) !== currentFilePath) {
    return;
  }

  await CommandFactory.run(MainModule, buildCommandFactoryRunOptions());
}

void main();
