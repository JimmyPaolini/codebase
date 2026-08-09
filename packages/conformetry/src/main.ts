import "reflect-metadata";
import { ConsoleLogger } from "@nestjs/common";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module";

/**
 * Bootstraps the NestJS command application.
 */
async function main(): Promise<void> {
  const logger = new ConsoleLogger();
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
