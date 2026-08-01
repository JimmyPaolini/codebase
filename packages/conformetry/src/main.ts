import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module.js";

/** Bootstraps the NestJS CommandFactory with buffered logs routed through pino `LoggerService`. */
async function main(): Promise<void> {
  const logger = new ConsoleLogger();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
