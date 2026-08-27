import path from "node:path";

import { InputService } from "@codependix/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CODEPENDIX_RUN_MODES, USAGE_MESSAGE } from "./codependix.constants";
import { CodependixService } from "./codependix.service";

import type { GraphRunOutcome } from "../delivery/delivery.types";
import type { CodependixCommandOptions } from "./codependix.types";

/**
 * CLI entry point for the codependix dependency graph export workflow.
 *
 * Exactly two modes, `--check` and `--write` — no per-graph-type subcommand.
 * Which graphs run, and where each project's export lands, is entirely a
 * function of `codependix.config.ts`, read by `@codependix/configuration`.
 */
@Command({
  description: "Run the codependix command",
  name: "codependix",
})
@Injectable()
export class CodependixCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly codependixService: CodependixService,
    private readonly inputService: InputService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CodependixCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Logs an outcome's failures and stale exports, and reports whether the run
   * as a whole should fail.
   *
   * Both are reported together rather than the first one short-circuiting the
   * other, since `CodependixService.run` already attempted every project
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

  /**
   * Returns the options with exactly one run mode set, or nothing.
   *
   * A command line naming both flags is rejected outright — there is no
   * sensible reading of "check and also write". A command line naming
   * neither is asked which it meant, when the session can be asked; it is
   * rejected otherwise, mirroring how `codometer`'s `--check`/`--write`
   * split is kept from silently defaulting to a write nobody asked for.
   */
  private async resolveOptions(
    options: CodependixCommandOptions,
  ): Promise<CodependixCommandOptions | undefined> {
    if (options.check === true && options.write === true) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reason: "Only one of --check or --write may be given",
      });
      return undefined;
    }

    if (options.check === true || options.write === true) {
      return options;
    }

    if (!this.inputService.canPrompt(options.interactive)) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reason: "Either --check or --write is required",
        usage: USAGE_MESSAGE,
      });
      return undefined;
    }

    const mode = await this.inputService.promptForSelect({
      choices: CODEPENDIX_RUN_MODES,
      message: "Check every configured export, or write them?",
    });

    return mode === "check"
      ? { ...options, check: true }
      : { ...options, write: true };
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

  /** Parses the opt-out from interactive prompting. */
  @Option({
    description: "Never prompt for missing values",
    flags: "--no-interactive",
  })
  public parseInteractive(): boolean {
    return false;
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
   * `CodependixService.run` isolates each project's failure to itself — so
   * this only decides the exit code from what came back: any failed project
   * or any stale export fails the run, and both are reported together rather
   * than the first one short-circuiting the other.
   */
  async run(
    _passedParameters: string[],
    options: CodependixCommandOptions = {},
  ): Promise<void> {
    try {
      const resolvedOptions = await this.resolveOptions(options);

      if (resolvedOptions === undefined) {
        process.exitCode = 1;
        return;
      }

      const workingDirectory = path.resolve(
        resolvedOptions.directory ?? process.cwd(),
      );
      const outcome = await this.codependixService.run(
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
      this.logger.error("💥 Failed running codependix", undefined, {
        reason: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
  }
}
