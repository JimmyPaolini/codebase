import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createLightship } from "lightship";

import { LoggerService } from "@codebase/logger";

import { environmentSchema } from "./constants";
import { MainModule } from "./main.module";

import type { INestApplication } from "@nestjs/common";

/**
 * Bootstraps the NestJS GraphQL API application.
 */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const logger = new LoggerService();
  logger.setContext("NestApplication");

  const lightship = await createLightship({
    port: environment.LIGHTSHIP_PORT,
  });

  const application: INestApplication = await NestFactory.create(MainModule, {
    bufferLogs: true,
    logger,
  });

  lightship.registerShutdownHandler(async () => {
    await application.close();
  });

  await application.listen(environment.PORT);
  lightship.signalReady();

  logger.log(
    `🌐 Serving GraphQL API on http://localhost:${environment.PORT}/graphql`,
  );
}

void main();
