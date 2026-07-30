import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

import { Injectable } from "@nestjs/common";

import type { CommandResult } from "./archive-logs.types";

/**
 * Helper service for command execution and local file IO in archive workflows.
 */
@Injectable()
export class ArchiveLogsShellService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  /**
   * Extract a human-readable failure message from a command result.
   */
  private extractFailureMessage(
    result: CommandResult,
    failureLabel: string,
  ): string {
    return (
      result.standardError.trim() ||
      result.standardOutput.trim() ||
      `${failureLabel} failed`
    );
  }

  /**
   * Build archive filename stem from the normalized window.
   */
  buildArchiveName(windowStart: string, windowEnd: string): string {
    return `archive-${windowStart.replaceAll(":", "-")}__${windowEnd.replaceAll(":", "-")}`;
  }

  /**
   * Query whether a GitHub API path returns a successful response.
   */
  githubApiExists(apiPath: string): boolean {
    const result = this.runCommand("gh", ["api", apiPath]);
    return result.status === 0;
  }

  /**
   * Read text from a file when it exists, returning empty string otherwise.
   */
  readExistingText(filePath: string): string {
    if (!existsSync(filePath)) {
      return "";
    }

    return readFileSync(filePath, "utf8");
  }

  /**
   * Read non-empty lines from a file.
   */
  readLines(filePath: string): string[] {
    return this.readExistingText(filePath)
      .split(/\r?\n/)
      .filter((lineValue) => lineValue !== "");
  }

  /**
   * Execute a command and capture output.
   */
  runCommand(
    command: string,
    argumentsList: string[],
    options: Record<string, unknown> = {},
  ): CommandResult {
    const result = spawnSync(command, argumentsList, {
      ...options,
      encoding: "utf8",
    });

    return {
      standardError: result.stderr,
      standardOutput: result.stdout,
      status: result.status,
    };
  }

  /**
   * Execute a command that must succeed, throwing on non-zero exit.
   */
  runCommandChecked(
    command: string,
    argumentsList: string[],
    optionsOrFailureLabel?:
      | string
      | {
          readonly failureLabel?: string;
          readonly spawnConfiguration?: Record<string, unknown>;
        },
  ): string {
    const options =
      typeof optionsOrFailureLabel === "string"
        ? { failureLabel: optionsOrFailureLabel }
        : optionsOrFailureLabel;
    const result = this.runCommand(
      command,
      argumentsList,
      options?.spawnConfiguration ?? {},
    );
    const failureLabel = options?.failureLabel ?? command;

    if (result.status !== 0) {
      throw new Error(this.extractFailureMessage(result, failureLabel));
    }

    return result.standardOutput;
  }

  /**
   * Execute a GitHub API call and parse JSON output.
   */
  runGithubApiJson(apiPath: string, argumentsList: string[] = []): unknown {
    const output = this.runCommandChecked(
      "gh",
      ["api", ...argumentsList, apiPath],
      {
        failureLabel: `gh api ${apiPath}`,
      },
    );
    return JSON.parse(output) as unknown;
  }

  /**
   * Execute a GitHub API call and return text output.
   */
  runGithubApiText(apiPath: string, argumentsList: string[] = []): string {
    return this.runCommandChecked("gh", ["api", ...argumentsList, apiPath], {
      failureLabel: `gh api ${apiPath}`,
    });
  }

  /**
   * Write JSON as pretty UTF-8 to a file.
   */
  writeJsonFile(filePath: string, value: unknown): void {
    writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  }

  /**
   * Write UTF-8 text to a file.
   */
  writeTextFile(filePath: string, value: string): void {
    writeFileSync(filePath, value, "utf8");
  }
}
