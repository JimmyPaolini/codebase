import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "../logger/logger.service";
import { PublishLogsService } from "../publish-logs/publish-logs.service";

import { DEFAULT_GITHUB_REPOSITORY } from "./archive-logs.constants";
import { ArchiveLogsService } from "./archive-logs.service";

import type { ArchiveLogsOptions } from "./archive-logs.types";

/**
 * CLI command that archives GitHub Actions runs for a given window.
 */
@Command({
  description: "Run the archive-logs command",
  name: "archive-logs",
})
@Injectable()
export class ArchiveLogsCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly logger: LoggerService,
    private readonly archiveService: ArchiveLogsService,
    private readonly publishLogsService: PublishLogsService,
  ) {
    super();
    this.logger.setContext(ArchiveLogsCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Execute the archive and publish steps for the resolved window.
   */
  private executeArchive(resolvedOptions: ArchiveLogsOptions): void {
    const archiveContext = this.archiveService.buildContext(
      resolvedOptions.start,
      resolvedOptions.end,
    );

    if (
      this.archiveService.archiveAlreadyExists(
        resolvedOptions.githubRepository,
        archiveContext,
      )
    ) {
      this.logger.log(
        `Archive already exists for window: ${archiveContext.archiveName}. Skipping.`,
      );
      return;
    }

    this.archiveService.collectAndZip(
      resolvedOptions.githubRepository,
      archiveContext,
      {
        ...(resolvedOptions.actor === undefined
          ? {}
          : { actor: resolvedOptions.actor }),
        ...(resolvedOptions.branch === undefined
          ? {}
          : { branch: resolvedOptions.branch }),
        ...(resolvedOptions.event === undefined
          ? {}
          : { event: resolvedOptions.event }),
        ...(resolvedOptions.name === undefined
          ? {}
          : { name: resolvedOptions.name }),
        ...(resolvedOptions.status === undefined
          ? {}
          : { status: resolvedOptions.status }),
      },
    );

    if (process.env["GITHUB_ACTIONS"] === "true") {
      this.publishLogsService.publishToBranch(
        resolvedOptions.githubToken,
        resolvedOptions.githubRepository,
        archiveContext,
      );
    }

    this.logger.log(
      `✅ Archived window ${resolvedOptions.start} → ${resolvedOptions.end}`,
    );
  }

  /**
   * Validate and normalize the date range from raw options.
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
    end: string;
    start: string;
  } {
    const rawStart =
      typeof options["start"] === "string" ? options["start"] : undefined;
    const rawEnd =
      typeof options["end"] === "string" ? options["end"] : undefined;
    if (!rawStart) {
      throw new Error("--start is required");
    }
    if (!rawEnd) {
      throw new Error("--end is required");
    }

    const start = this.normalizeRfc3339ToUtc(rawStart);
    const end = this.normalizeRfc3339ToUtc(rawEnd);
    if (start >= end) {
      throw new Error("--start must be before --end");
    }

    return { end, start };
  }

  /**
   * Validate environment variables and return repository and token.
   */
  private resolveEnvironment(): {
    githubRepository: string;
    githubToken: string;
  } {
    const githubRepository = DEFAULT_GITHUB_REPOSITORY;
    const githubToken = process.env["GH_TOKEN"];
    if (!githubToken) {
      throw new Error("GH_TOKEN environment variable is required");
    }

    return { githubRepository, githubToken };
  }

  /**
   * Parse and validate resolved options before executing.
   */
  private resolveOptions(options: Record<string, unknown>): ArchiveLogsOptions {
    const { githubRepository, githubToken } = this.resolveEnvironment();
    const { end, start } = this.resolveDateRange(options);

    return {
      ...(typeof options["actor"] === "string"
        ? { actor: options["actor"] }
        : {}),
      end,
      start,
      ...(typeof options["branch"] === "string"
        ? { branch: options["branch"] }
        : {}),
      ...(typeof options["event"] === "string"
        ? { event: options["event"] }
        : {}),
      githubRepository,
      githubToken,
      ...(typeof options["name"] === "string" ? { name: options["name"] } : {}),
      ...(typeof options["status"] === "string"
        ? { status: options["status"] }
        : {}),
    };
  }

  // 🌎 Public Methods

  /**
   * Parses the optional workflow run actor filter.
   */
  @Option({
    description: "Workflow run actor login",
    flags: "--actor <actor>",
  })
  parseActor(value: string): string {
    return value;
  }

  /**
   * Parses the optional workflow run branch filter.
   */
  @Option({
    description: "Workflow run branch name",
    flags: "--branch <branch>",
  })
  parseBranch(value: string): string {
    return value;
  }

  /**
   * Parses the --end datetime option value.
   */
  @Option({
    description: "RFC3339 end datetime (timezone required)",
    flags: "-e, --end <end>",
  })
  parseEnd(value: string): string {
    return value;
  }

  /**
   * Parses the optional workflow run event filter.
   */
  @Option({
    description: "Workflow run event name",
    flags: "--event <event>",
  })
  parseEvent(value: string): string {
    return value;
  }

  /**
   * Parses the optional workflow file name or workflow ID filter.
   */
  @Option({
    description: "Workflow file name or workflow ID",
    flags: "--name <name>",
  })
  parseName(value: string): string {
    return value;
  }

  /**
   * Parses the --start datetime option value.
   */
  @Option({
    description: "RFC3339 start datetime (timezone required)",
    flags: "-s, --start <start>",
  })
  parseStart(value: string): string {
    return value;
  }

  /**
   * Parses the optional workflow run status filter.
   */
  @Option({
    description: "Workflow run status value",
    flags: "--status <status>",
  })
  parseStatus(value: string): string {
    return value;
  }

  /**
   * Archive workflow runs in the specified window and optionally publish.
   */
  async run(
    _passedParameters: string[],
    options?: Record<string, unknown>,
  ): Promise<void> {
    await Promise.resolve();

    try {
      this.executeArchive(this.resolveOptions(options ?? {}));
    } catch (error) {
      this.logger.error(
        `❌ Archive failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exit(1);
    }
  }
}
