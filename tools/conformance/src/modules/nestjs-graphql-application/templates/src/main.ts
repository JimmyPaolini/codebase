import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { {{namePascalCase}}Module } from "./modules/{{nameKebabCase}}/{{nameKebabCase}}.module";
import { LoggerService } from "./modules/logger/logger.service";

async function bootstrap(): Promise<void> {
  const logger = new LoggerService();
  logger.setContext("NestApplication");

  const app = await NestFactory.create({{namePascalCase}}Module, {
    bufferLogs: true,
    logger,
  });

  const port = process.env["PORT"] ?? 3000;
  await app.listen(port);
  logger.log(`GraphQL API running on http://localhost:${port}/graphql`);
}

void bootstrap();
