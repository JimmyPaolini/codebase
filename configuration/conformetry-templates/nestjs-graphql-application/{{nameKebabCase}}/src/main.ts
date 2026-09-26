import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { createLightship } from "lightship";

import { LoggerService } from "@codebase/logger";

import { environmentSchema } from "./main.constants";
import { {{namePascalCase}}Module } from "./modules/{{nameKebabCase}}/{{nameKebabCase}}.module";

import type { INestApplication } from "@nestjs/common";

async function bootstrap(): Promise<void> {
  const environment = environmentSchema.parse(process.env);
  const logger = new LoggerService();
  logger.setContext("NestApplication");

  const lightship = await createLightship({
    port: environment.LIGHTSHIP_PORT,
  });

  const app: INestApplication = await NestFactory.create({{namePascalCase}}Module, {
    bufferLogs: true,
    logger,
  });

  lightship.registerShutdownHandler(async () => {
    await app.close();
  });

  await app.listen(environment.APPLICATION_PORT);
  lightship.signalReady();

  logger.log(`GraphQL API running on http://localhost:${environment.APPLICATION_PORT}/graphql`);
}

void bootstrap();
