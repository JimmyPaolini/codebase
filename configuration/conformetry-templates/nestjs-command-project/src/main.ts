import "reflect-metadata";

import { CommandFactory } from "nest-commander";

import { LoggerService } from "./modules/logger/logger.service";
import { MainModule } from "./main.module";

async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
