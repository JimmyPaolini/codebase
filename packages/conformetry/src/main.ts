import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module";
import { LoggerService } from "./modules/logger/logger.service";

/** Bootstraps the NestJS CommandFactory with buffered logs routed through pino `LoggerService`. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
