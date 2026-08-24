import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";
import { withDefaultCommand } from "./main.utilities";

/**
 * Bootstraps the codometer CLI command application.
 *
 * Standard output belongs to the report: `codometer --json` writes a document
 * meant to be piped into something that parses it, and `codometer --markdown`
 * one meant to be redirected into a file. Every diagnostic therefore goes to
 * standard error, chosen here — before anything logs — because the pino
 * instance is built on first use.
 */
async function main(): Promise<void> {
  LoggerService.logToStandardError();

  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  process.argv = [
    ...process.argv.slice(0, 2),
    ...withDefaultCommand(process.argv.slice(2)),
  ];

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
