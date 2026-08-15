import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { MainModule } from "./main.module";
import { LoggerService } from "./modules/logger/logger.service";

/** Bootstraps the NestJS CLI application via `nest-commander`, wiring up pino logging before the module initializes. */
async function main(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

void main();
