import path from "node:path";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { PROJECT_ROOT_DIRECTORY } from "../../constants";

import { EXAMPLES_OUTPUT_DIRECTORY, USAGE_MESSAGE } from "./examples.constants";
import { ExamplesService } from "./examples.service";

import type { ExamplesCommandOptions } from "./examples.types";

/**
 * Renders every worked example, or checks the committed output is current.
 *
 * Exactly two modes, `--check` and `--write`, mirroring `codependix` itself —
 * both because the shape is worth demonstrating and because it is the right
 * shape: a command line naming neither has nothing to select a mode with, and
 * silently defaulting to a write nobody asked for would rewrite committed
 * documentation on a check run.
 */
@Command({
  description: "Render every codependix example, or check the committed output",
  name: "examples",
})
@Injectable()
export class ExamplesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly examplesService: ExamplesService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ExamplesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads exactly one run mode from the command line, or reports why not. */
  private selectMode(options: ExamplesCommandOptions): boolean {
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

  /** Describes a raised value, whether or not it was an `Error`. */
  describeError(error: unknown): string {
    return error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
  }

  /** Parses the `--check` flag from command-line input. */
  @Option({
    description: "Check every committed example is current, without writing",
    flags: "--check",
  })
  public parseCheck(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /** Parses the directory the rendered examples are written into. */
  @Option({
    description: "Directory the rendered examples are written into",
    flags: "-o, --output [output]",
  })
  public parseOutput(value: string | undefined): string {
    return value ?? EXAMPLES_OUTPUT_DIRECTORY;
  }

  /** Parses the `--write` flag from command-line input. */
  @Option({
    description: "Write every rendered example",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /** Renders every example in check or write mode. */
  async run(
    _passedParameters: string[],
    options: ExamplesCommandOptions = {},
  ): Promise<void> {
    if (!this.selectMode(options)) {
      process.exitCode = 1;
      return;
    }

    const outputDirectory = path.resolve(
      PROJECT_ROOT_DIRECTORY,
      options.output ?? EXAMPLES_OUTPUT_DIRECTORY,
    );

    try {
      const outcome = await this.examplesService.run(
        options.check === true ? "check" : "write",
        outputDirectory,
      );

      if (outcome.stalePaths.length > 0) {
        this.logger.error("🕸️ Found stale codependix examples", undefined, {
          paths: outcome.stalePaths,
        });
        process.exitCode = 1;
        return;
      }

      this.logger.info("🕸️ Rendered every codependix example", undefined, {
        files: outcome.writtenCount,
      });
    } catch (error) {
      this.logger.error("💥 Failed rendering codependix examples", undefined, {
        reason: this.describeError(error),
      });
      process.exitCode = 1;
    }
  }
}
