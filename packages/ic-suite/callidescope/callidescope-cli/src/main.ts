#!/usr/bin/env node
// The shebang is what makes the emitted `src/main.js` usable as this package's
// `bin`. TypeScript copies it through to the output verbatim, so the built
// entry runs under a bare `node` with no loader registered — the decorator
// metadata NestJS constructor injection reads is already in that output,
// because `configuration/tsconfig.json` sets `emitDecoratorMetadata`. The
// executable bit is deliberately not managed here: npm and pnpm both set it on
// a `bin` target at install time, even when the file ships mode 644.
import "reflect-metadata";
import { CommandFactory } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "./main.module";

/**
 * Bootstraps the callidescope CLI command application.
 *
 * Standard output belongs to the result: `callidescope --format json` writes a
 * document meant to be piped into something that parses it, and the markdown
 * and mermaid formats ones meant to be redirected into a file. Every diagnostic
 * therefore goes to standard error, chosen here — before anything logs —
 * because the pino instance is built on first use. Without it a log line lands
 * mid-document and every reader of that stream reads it as data, so the format
 * flags print something no parser accepts.
 *
 * The error handler is not optional decoration. nest-commander's own default
 * writes the error to stderr and returns, leaving the exit code at zero — so
 * anything a command throws rather than reports becomes a run that printed a
 * stack trace and passed. For a tool whose whole purpose is gating a pull
 * request, that turns any unexpected failure into a green check, which is a
 * worse outcome than the failure itself.
 */
async function main(): Promise<void> {
  LoggerService.logToStandardError();

  const logger = new LoggerService();
  logger.setContext("CommandFactory");

  await CommandFactory.run(MainModule, {
    bufferLogs: true,
    logger,
    serviceErrorHandler: (error: Error): void => {
      logger.error("🔭 Failed a run", error.stack, { reason: error.message });
      process.exitCode = 1;
    },
  });
}

void main();
