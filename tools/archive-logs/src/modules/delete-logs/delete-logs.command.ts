import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";

import {
  DELETE_END_OPTION_DESCRIPTION,
  DELETE_START_OPTION_DESCRIPTION,
} from "./delete-logs.constants";
import { DeleteLogsService } from "./delete-logs.service";

import type { DeleteLogsOptions } from "./delete-logs.types";

/**
 * CLI command that deletes workflow runs for a given window.
 */
@Command({
  description: "Run the delete-logs command",
  name: "delete-logs",
})
@Injectable()
export class DeleteLogsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly deleteService: DeleteLogsService,
  ) {
    super();
    this.logger.setContext(DeleteLogsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Normalize RFC3339 datetime to UTC with whole-second precision.
   */
  private normalizeRfc3339ToUtc(value: string): string {
    const rfc3339Pattern =
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([Zz]|[+-][0-9]{2}:[0-9]{2})$/;

    if (!rfc3339Pattern.test(value)) {
      throw new TypeError(`invalid RFC3339 datetime: ${value}`);
    }

    const normalizedValue = value.replace("Z", "+00:00").replace("z", "+00:00");
    const parsedDateTime = new Date(normalizedValue);
    if (Number.isNaN(parsedDateTime.getTime())) {
      throw new TypeError(`invalid RFC3339 datetime: ${value}`);
    }

    return parsedDateTime.toISOString().replace(".000Z", "Z");
  }

  /**
   * Validate and normalize the date range from raw options.
   */
  private resolveDateRange(options: Record<string, unknown>): {
    deleteEnd: string;
    deleteStart?: string;
  } {
    const rawStart =
      typeof options["start"] === "string" ? options["start"] : undefined;
    const rawEnd =
      typeof options["end"] === "string" ? options["end"] : undefined;
    if (!rawEnd) {
      throw new Error("--end is required");
    }

    const deleteEnd = this.normalizeRfc3339ToUtc(rawEnd);
    if (!rawStart) {
      return { deleteEnd };
    }

    const deleteStart = this.normalizeRfc3339ToUtc(rawStart);
    if (deleteStart >= deleteEnd) {
      throw new Error("--start must be before --end");
    }

    return { deleteEnd, deleteStart };
  }

  /**
   * Validate environment variables and return repository and token.
   */
  private resolveEnvironment(): {
    githubRepository: string;
    githubToken: string;
  } {
    const githubRepository = process.env["GITHUB_REPOSITORY"];
    const githubToken = process.env["GH_TOKEN"];
    if (!githubRepository) {
      throw new Error("GITHUB_REPOSITORY environment variable is required");
    }
    if (!githubToken) {
      throw new Error("GH_TOKEN environment variable is required");
    }

    return { githubRepository, githubToken };
  }

  /**
   * Parse and validate resolved options before executing.
   */
  private resolveOptions(options: Record<string, unknown>): DeleteLogsOptions {
    const { githubRepository, githubToken } = this.resolveEnvironment();
    const { deleteEnd, deleteStart } = this.resolveDateRange(options);

    if (!deleteStart) {
      return {
        deleteEnd,
        githubRepository,
        githubToken,
      };
    }

    return {
      deleteEnd,
      deleteStart,
      githubRepository,
      githubToken,
    };
  }

  // 🌎 Public Methods

  /**
   * Parses the --end datetime option value.
   */
  @Option({
    description: DELETE_END_OPTION_DESCRIPTION,
    flags: "-e, --end <end>",
  })
  parseEnd(value: string): string {
    return value;
  }

  /**
   * Parses the --start datetime option value.
   */
  @Option({
    description: DELETE_START_OPTION_DESCRIPTION,
    flags: "-s, --start <start>",
  })
  parseStart(value: string): string {
    return value;
  }

  /**
   * Delete workflow runs in the specified window or before an end date.
   */
  async run(
    _passedParameters: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.resolve();

    try {
      const resolvedOptions = this.resolveOptions(options ?? {});
      if (resolvedOptions.deleteStart) {
        this.deleteService.deleteRunsInWindow(
          resolvedOptions.githubRepository,
          resolvedOptions.deleteStart,
          resolvedOptions.deleteEnd,
        );
        this.logger.log(
          `🗑️ Deleted window ${resolvedOptions.deleteStart} → ${resolvedOptions.deleteEnd}`,
        );
      } else {
        this.deleteService.deleteRunsBeforeEnd(
          resolvedOptions.githubRepository,
          resolvedOptions.deleteEnd,
        );
        this.logger.log(`🗑️ Deleted runs before ${resolvedOptions.deleteEnd}`);
      }
    } catch (error) {
      this.logger.error(
        `❌ Delete failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
}
