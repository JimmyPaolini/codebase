import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { LoggerService } from "../logger/logger.service";

import type {
  ArchiveContext,
  CommandResult,
} from "../archive-logs/archive-logs.types";

/**
 * Service that publishes archive artifacts to the storage branch.
 */
@Injectable()
export class PublishLogsService {
  // 🏗 Dependency Injection

  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(PublishLogsService.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Ensure the archive branch is checked out locally.
   */
  private checkoutArchiveBranch(archiveBranch: string): void {
    const branchExistsResult = this.runCommand("git", [
      "ls-remote",
      "--exit-code",
      "--heads",
      "origin",
      archiveBranch,
    ]);
    if (branchExistsResult.status === 0) {
      this.runCommandChecked(
        "git",
        ["fetch", "origin", archiveBranch],
        `fetch ${archiveBranch}`,
      );
      this.runCommandChecked(
        "git",
        ["checkout", "-B", archiveBranch, `origin/${archiveBranch}`],
        `checkout ${archiveBranch}`,
      );
      return;
    }

    this.runCommandChecked(
      "git",
      ["checkout", "--orphan", archiveBranch],
      `create orphan ${archiveBranch}`,
    );
    this.runCommandChecked(
      "git",
      ["rm", "-rf", "--quiet", "."],
      "clear orphan branch",
    );
  }

  /**
   * Commit and push archive artifact changes.
   */
  private commitAndPush(archiveContext: ArchiveContext): void {
    this.runCommandChecked(
      "git",
      [
        "add",
        archiveContext.archiveFileRelativePath,
        archiveContext.indexFileRelativePath,
      ],
      "stage archive outputs",
    );

    const diffResult = this.runCommand("git", ["diff", "--cached", "--quiet"]);
    if (diffResult.status === 0) {
      return;
    }

    this.runCommandChecked(
      "git",
      [
        "commit",
        "-m",
        `ci(deployments): 👷 archive logs runs ${archiveContext.archiveName}`,
      ],
      "commit archive outputs",
    );
    this.runCommandChecked(
      "git",
      ["push", "origin", archiveContext.archiveBranch],
      "push archive branch",
    );
  }

  /**
   * Configure git metadata for archive branch publishing.
   */
  private configureGit(githubToken: string, githubRepository: string): void {
    this.runCommandChecked(
      "git",
      ["config", "user.name", "github-actions[bot]"],
      "set git user name",
    );
    this.runCommandChecked(
      "git",
      [
        "config",
        "user.email",
        "41898282+github-actions[bot]@users.noreply.github.com",
      ],
      "set git user email",
    );
    this.runCommandChecked(
      "git",
      [
        "remote",
        "set-url",
        "origin",
        `https://x-access-token:${githubToken}@github.com/${githubRepository}.git`,
      ],
      "set authenticated remote",
    );
  }

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
   * Read text from a file when it exists, returning empty string otherwise.
   */
  private readExistingText(filePath: string): string {
    if (!existsSync(filePath)) {
      return "";
    }

    return readFileSync(filePath, "utf8");
  }

  /**
   * Execute a command and capture output.
   */
  private runCommand(
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
  private runCommandChecked(
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
   * Update the repository index file with newly archived run entries.
   */
  private updateIndexFile(archiveContext: ArchiveContext): void {
    const indexPath = path.join(
      process.cwd(),
      archiveContext.indexFileRelativePath,
    );
    const remoteIndexResult = this.runCommand(
      "git",
      [
        "show",
        `${archiveContext.archiveBranch}:${archiveContext.indexFileRelativePath}`,
      ],
      { stdio: "pipe" },
    );

    if (remoteIndexResult.status === 0) {
      this.writeTextFile(indexPath, remoteIndexResult.standardOutput);
    } else {
      this.writeTextFile(indexPath, "");
    }

    const newEntries = this.readExistingText(
      archiveContext.newlyArchivedRunIdentifiersPath,
    );
    if (newEntries !== "") {
      this.writeTextFile(
        indexPath,
        `${this.readExistingText(indexPath)}${newEntries}`,
      );
    }
  }

  /**
   * Copy the archive zip into the repository working tree.
   */
  private writeArchiveFiles(archiveContext: ArchiveContext): void {
    mkdirSync(
      path.join(
        process.cwd(),
        "archives",
        archiveContext.archiveName.slice(8, 12),
      ),
      {
        recursive: true,
      },
    );
    mkdirSync(path.join(process.cwd(), "index"), { recursive: true });
    this.runCommandChecked(
      "cp",
      [
        archiveContext.archiveZipPath,
        path.join(process.cwd(), archiveContext.archiveFileRelativePath),
      ],
      "copy archive zip",
    );
  }

  /**
   * Write UTF-8 text to a file.
   */
  private writeTextFile(filePath: string, value: string): void {
    writeFileSync(filePath, value, "utf8");
  }

  // 🌎 Public Methods

  /**
   * Publish archive zip and index updates to the storage branch.
   */
  publishToBranch(
    githubToken: string,
    githubRepository: string,
    archiveContext: ArchiveContext,
  ): void {
    this.configureGit(githubToken, githubRepository);
    this.writeArchiveFiles(archiveContext);
    this.updateIndexFile(archiveContext);
    this.checkoutArchiveBranch(archiveContext.archiveBranch);
    this.commitAndPush(archiveContext);

    this.logger.log(
      `📦 Published ${archiveContext.archiveName} to ${archiveContext.archiveBranch}`,
    );
  }
}
