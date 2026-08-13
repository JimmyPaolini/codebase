import { workspaceRoot } from "@nx/devkit";
import { FsTree } from "nx/src/generators/tree";

import { LoggerService } from "./modules/logger/logger.service";

import type { Tree } from "@nx/devkit";
import type { CommandFactoryRunOptions } from "nest-commander/src/command-factory.interface";

/**
 * Builds and returns the command factory run options, including a logger.
 */
export function buildCommandFactoryRunOptions(): CommandFactoryRunOptions {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");
  const commandFactoryRunOptions: CommandFactoryRunOptions = {
    bufferLogs: true,
    logger,
    serviceErrorHandler: (error: Error): never => {
      process.exitCode = 1;
      throw error;
    },
  };
  return commandFactoryRunOptions;
}

/**
 * Creates a file-system-backed Nx tree rooted at the current workspace.
 */
export function createWorkspaceTree(): Tree {
  return new FsTree(workspaceRoot, false);
}
