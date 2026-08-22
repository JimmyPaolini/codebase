import "reflect-metadata";
import { repl } from "@nestjs/core";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";

const logger = new LoggerService();
logger.setContext("Repl");

/**
 * Starts the NestJS REPL for the callidescope application.
 */
async function bootstrap(): Promise<void> {
  await repl(MainModule);
}

bootstrap().catch((error: unknown) => {
  logger.error("🔥 Crashed before completing", undefined, {
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
