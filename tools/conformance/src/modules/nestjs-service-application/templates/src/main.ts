import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { LoggerService } from "./modules/logger/logger.service";
import { MainModule } from "./main.module";

async function bootstrap(): Promise<void> {
  const application = await NestFactory.create(MainModule, {
    bufferLogs: true,
  });
  const logger = application.get(LoggerService);
  application.useLogger(logger);
  await application.init();
}

void bootstrap();
