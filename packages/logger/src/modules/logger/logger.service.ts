import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { ConsoleLogger, Injectable, Scope } from "@nestjs/common";
import pino from "pino";

/**
 * Transient-scoped logger so each injecting class gets its own instance.
 * Each consumer calls `setContext(ClassName.name)` to tag every log line
 * with the originating class. Backed by pino for structured JSON output in
 * production and human-readable pretty-print in development.
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService extends ConsoleLogger {
  // 🏗 Dependency Injection

  constructor() {
    super();
  }

  // 🔐 Private Fields

  private static readonly isProduction =
    process.env["NODE_ENV"] === "production";

  private static readonly root = pino(LoggerService.createPinoOptions());

  private child: pino.Logger = LoggerService.root;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Build pino options for production or local development output modes. */
  private static createPinoOptions(): pino.LoggerOptions {
    if (LoggerService.isProduction) {
      return { level: process.env["LOG_LEVEL"] ?? "info" };
    }

    return {
      level: process.env["LOG_LEVEL"] ?? "info",
      transport: {
        options: { colorize: true, singleLine: true },
        target: "pino-pretty",
      },
    };
  }

  // 🌎 Public Methods

  /** Normalizes unknown errors into a stable message and timestamped log line. */
  buildErrorLogEntry(
    context: string,
    error: unknown,
  ): { errorMessage: string; logLine: string } {
    const errorMessage =
      error instanceof Error ? error.stack || error.message : String(error);

    return {
      errorMessage,
      logLine: `[${new Date().toISOString()}] ${context}: ${errorMessage}\n`,
    };
  }

  /** Builds a timestamped output log file path and ensures the output directory exists. */
  createTimestampedOutputLogFilePath(filePrefix: string): string {
    const outputDirectory = path.join(process.cwd(), "output");
    if (!existsSync(outputDirectory)) {
      mkdirSync(outputDirectory, { recursive: true });
    }

    return path.join(
      outputDirectory,
      `${filePrefix}-${new Date().toISOString().replaceAll(/[:.]/g, "-")}.log`,
    );
  }

  /** Logs a debug message at the `debug` level. */
  override debug(message: unknown, context?: string): void {
    this.child.debug({ context: context ?? this.context }, String(message));
  }

  /** Logs an error message at the `error` level, optionally including a stack trace. */
  override error(message: unknown, stackOrContext?: string): void {
    this.child.error(
      { context: this.context, stack: stackOrContext },
      String(message),
    );
  }

  /** Logs an informational message at the `info` level. */
  override log(message: unknown, context?: string): void {
    this.child.info({ context: context ?? this.context }, String(message));
  }

  /** Sets the context label included in every subsequent log line. */
  override setContext(context: string): void {
    super.setContext(context);
    this.child = LoggerService.root.child({ context });
  }

  /** Logs a verbose message at the `trace` level. */
  override verbose(message: unknown, context?: string): void {
    this.child.trace({ context: context ?? this.context }, String(message));
  }

  /** Logs a warning message at the `warn` level. */
  override warn(message: unknown, context?: string): void {
    this.child.warn({ context: context ?? this.context }, String(message));
  }
}
