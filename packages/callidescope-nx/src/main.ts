import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";

/**
 * Bootstraps the callidescope-nx CLI command application.
 *
 * Log lines are sent to standard error before anything can write one, because
 * standard output is this command's return value: what it prints is
 * substituted straight into `callidescope --directories`, and a log line
 * mixed into that stream would be read as a directory.
 */
async function main(): Promise<void> {
  LoggerService.logToStandardError();

  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
