import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module.js";
import { LoggerService } from "./modules/logger/logger.service.js";

/**
 * Bootstraps the metitur CLI command application.
 */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
