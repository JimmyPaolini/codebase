import path from "node:path";

import { InputError, InputService } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { MapService } from "./map.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { MapCommandOptions } from "./map.types";

/**
 * CLI entry point for the codependix dependency graph export workflow.
 *
 * Exactly two modes, `--check` and `--write` — no per-graph-type subcommand.
 * Which graphs run, and where each project's export lands, is entirely a
 * function of `codependix.config.ts`, read by `@codependix/configuration`.
 */
@Command({
  description: "Map every configured dependency graph and export it",
  name: "map",
})
@Injectable()
export class MapCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly mapService: MapService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(MapCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Logs why a run ended before it started, and fails it.
   *
   * A command line the input service refused — two modes named, none named
   * with no terminal to ask at, or a question walked away from — is reported
   * as a rejected command line rather than as a crash. Nothing was
   * attempted, and the reader's next move is to retype the flags, not to
   * read a stack trace.
   */
  private reportFailure(error: unknown): void {
    this.logger.error(
      error instanceof InputError
        ? "🕸️ Rejected the command line"
        : "💥 Failed running codependix",
      undefined,
      { reason: error instanceof Error ? error.message : String(error) },
    );

    process.exitCode = 1;
  }

  /**
   * Logs an outcome's failures and stale exports, and reports whether the run
   * as a whole should fail.
   *
   * Both are reported together rather than the first one short-circuiting the
   * other, since `MapService.run` already attempted every project
   * regardless of an earlier one's failure.
   */
  private reportOutcome(outcome: GraphRunOutcome): boolean {
    const staleProjects = outcome.results.filter((result) => !result.isCurrent);

    if (outcome.failures.length > 0) {
      this.logger.error("💥 Failed running codependix", undefined, {
        failures: outcome.failures,
      });
    }

    if (staleProjects.length > 0) {
      this.logger.error("🕸️ Found stale codependix exports", undefined, {
        projects: staleProjects.map((result) => result.projectName),
      });
    }

    return outcome.failures.length === 0 && staleProjects.length === 0;
  }

  // 🌎 Public Methods

  /** Parses the `--check` flag from command-line input. */
  @Option({
    description: "Check every configured export is current, without writing",
    flags: "--check",
  })
  public parseCheck(value: boolean | undefined): boolean {
    return this.inputService.parseFlagOption(value);
  }

  /** Parses the optional configuration path from command-line input. */
  @Option({
    description: "Path to the codependix configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses the directory whose Nx workspace this run reads. */
  @Option({
    description: "Directory whose Nx workspace this run reads",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return this.inputService.parsePathOption(value);
  }

  /** Parses the `--write` flag from command-line input. */
  @Option({
    description: "Write every configured export",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return this.inputService.parseFlagOption(value);
  }

  /**
   * Runs every configured graph export in check or write mode.
   *
   * Every project is attempted regardless of whether an earlier one failed —
   * `MapService.run` isolates each project's failure to itself — so
   * this only decides the exit code from what came back: any failed project
   * or any stale export fails the run, and both are reported together rather
   * than the first one short-circuiting the other.
   */
  async run(
    _passedParameters: string[],
    options: MapCommandOptions = {},
  ): Promise<void> {
    try {
      const resolvedOptions = await this.inputService.resolveOptions(options);
      const workingDirectory = path.resolve(
        resolvedOptions.directory ?? process.cwd(),
      );
      const outcome = await this.mapService.run(
        resolvedOptions,
        workingDirectory,
      );

      if (!this.reportOutcome(outcome)) {
        process.exitCode = 1;
        return;
      }

      this.logger.info(
        "🕸️ Verified every configured codependix export is current",
        undefined,
        { projects: outcome.results.length },
      );
    } catch (error) {
      this.reportFailure(error);
    }
  }
}
