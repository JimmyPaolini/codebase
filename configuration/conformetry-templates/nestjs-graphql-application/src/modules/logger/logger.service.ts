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
  private static readonly isProduction =
    process.env["NODE_ENV"] === "production";

  private static readonly root = pino(
    LoggerService.isProduction
      ? { level: process.env["LOG_LEVEL"] ?? "info" }
      : {
          level: process.env["LOG_LEVEL"] ?? "info",
          transport: {
            target: "pino-pretty",
            options: { colorize: true, singleLine: true },
          },
        },
  );

  private child: pino.Logger = LoggerService.root;

  /** Sets the context label included in every subsequent log line. */
  override setContext(context: string): void {
    super.setContext(context);
    this.child = LoggerService.root.child({ context });
  }

  /** Logs an informational message at the `info` level. */
  override log(message: unknown, context?: string): void {
    this.child.info({ context: context ?? this.context }, String(message));
  }

  /** Logs a warning message at the `warn` level. */
  override warn(message: unknown, context?: string): void {
    this.child.warn({ context: context ?? this.context }, String(message));
  }

  /** Logs an error message at the `error` level, optionally including a stack trace. */
  override error(message: unknown, stackOrContext?: string): void {
    this.child.error(
      { context: this.context, stack: stackOrContext },
      String(message),
    );
  }

  /** Logs a debug message at the `debug` level. */
  override debug(message: unknown, context?: string): void {
    this.child.debug({ context: context ?? this.context }, String(message));
  }

  /** Logs a verbose message at the `trace` level. */
  override verbose(message: unknown, context?: string): void {
    this.child.trace({ context: context ?? this.context }, String(message));
  }
}
