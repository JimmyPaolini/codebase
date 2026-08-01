import "reflect-metadata";
import { NestFactory } from "@nestjs/core";

import { MainModule } from "./main.module";
import { LoggerService } from "./modules/logger/logger.service";

/** Bootstraps the NestJS application with buffered logs routed through pino `LoggerService`. */
async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(MainModule, {
    bufferLogs: true,
  });
  const logger = application.get(LoggerService);
  application.useLogger(logger);
  await application.init();
}

void bootstrap();
