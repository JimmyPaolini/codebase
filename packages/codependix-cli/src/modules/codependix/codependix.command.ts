import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { USAGE_MESSAGE } from "./codependix.constants";
import { CodependixService } from "./codependix.service";

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
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CodependixCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Reads exactly one run mode from the command line, or reports why not.
   *
   * A command line naming neither flag, or both, has nothing to select a run
   * mode with — mirroring how `codometer`'s `--check`/`--write` split is kept
   * from silently defaulting to a write nobody asked for.
   */
  private selectMode(options: CodependixCommandOptions): boolean {
    if (options.check === true && options.write === true) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reason: "Only one of --check or --write may be given",
      });
      return false;
    }

    if (options.check !== true && options.write !== true) {
      this.logger.error("🕸️ Rejected the command line", undefined, {
        reason: "Either --check or --write is required",
        usage: USAGE_MESSAGE,
      });
      return false;
    }

    return true;
  }

  // 🌎 Public Methods

  /** Parses the `--check` flag from command-line input. */
  @Option({
    description: "Check every configured export is current, without writing",
    flags: "--check",
  })
  public parseCheck(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /** Parses the optional configuration path from command-line input. */
  @Option({
    description: "Path to the codependix configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /** Parses the directory whose Nx workspace this run reads. */
  @Option({
    description: "Directory whose Nx workspace this run reads",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return value ?? process.cwd();
  }

  /** Parses the `--write` flag from command-line input. */
  @Option({
    description: "Write every configured export",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Runs every configured graph export in check or write mode.
   */
  async run(
    _passedParameters: string[],
    options: CodependixCommandOptions = {},
  ): Promise<void> {
    if (!this.selectMode(options)) {
      process.exitCode = 1;
      return;
    }

    const workingDirectory = path.resolve(options.directory ?? process.cwd());

    try {
      const results = [
        ...(await this.codependixService.runNxGraphs(
          options,
          workingDirectory,
        )),
        ...(await this.codependixService.runNestjsGraphs(
          options,
          workingDirectory,
        )),
        ...(await this.codependixService.runImportGraphs(
          options,
          workingDirectory,
        )),
      ];
      const staleProjects = results.filter((result) => !result.isCurrent);

      if (staleProjects.length > 0) {
        this.logger.error("🕸️ Found stale codependix exports", undefined, {
          projects: staleProjects.map((result) => result.projectName),
        });
        process.exitCode = 1;
        return;
      }

      this.logger.info(
        "🕸️ Verified every configured codependix export is current",
        undefined,
        { projects: results.length },
      );
    } catch (error) {
      this.logger.error("💥 Failed running codependix", undefined, {
        reason: error instanceof Error ? error.message : String(error),
      });
      process.exitCode = 1;
    }
  }
}
