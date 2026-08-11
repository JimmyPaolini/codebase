import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module";
import { LoggerService } from "./modules/logger/logger.service";

/**
 * Bootstraps the NestJS command application.
 */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, {
    bufferLogs: true,
    errorHandler: (error) => {
      process.exitCode = 1;
      logger.error(error);
    },
    logger,
    serviceErrorHandler: (error) => {
      process.exitCode = 1;
      logger.error(error);
    },
  });
}

void main();
