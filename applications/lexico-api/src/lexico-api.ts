import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { createLightship } from "lightship";

import { LoggerService } from "@codebase/logger";

import { environmentSchema } from "./lexico-api.constants";
import { LexicoApiModule } from "./lexico-api.module";

import type { INestApplication } from "@nestjs/common";

/**
 * Bootstraps the NestJS GraphQL API application.
 */
async function main(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const logger = new LoggerService();
  logger.setContext("NestApplication");

  const lightship = await createLightship({
    port: environment.LEXICO_API_LIGHTSHIP_PORT,
  });

  const application: INestApplication = await NestFactory.create(
    LexicoApiModule,
    {
      bufferLogs: true,
      logger,
    },
  );

  lightship.registerShutdownHandler(async () => {
    await application.close();
  });

  await application.listen(environment.LEXICO_API_PORT);
  lightship.signalReady();

  logger.log(
    `🌐 Serving GraphQL API on http://localhost:${environment.LEXICO_API_PORT}/graphql`,
  );
}

void main();
