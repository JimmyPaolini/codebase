import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";

const logger = new LoggerService();
logger.setContext("CommandFactory");

/**
 * Bootstraps the callidescope CLI command application.
 */
async function main(): Promise<void> {
  await CommandFactory.run(MainModule, { bufferLogs: true, logger });
}

main().catch((error: unknown) => {
  logger.error("🔥 Crashed before completing", undefined, {
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
});
