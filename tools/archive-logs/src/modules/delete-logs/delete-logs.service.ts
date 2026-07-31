import { spawnSync } from "node:child_process";

import { Injectable } from "@nestjs/common";

import { workflowRunsResponseSchema } from "../archive-logs/archive-logs.constants";
import { buildWorkflowRunsUrl } from "../archive-logs/workflow-runs.utilities.js";

import type {
  CommandResult,
  WorkflowRun,
  WorkflowRunFilters,
  WorkflowRunsResponse,
} from "../archive-logs/archive-logs.types";

/**
 * Service that deletes GitHub Actions workflow runs.
 */
@Injectable()
export class DeleteLogsService {
  // 🏗 Dependency Injection

  constructor() {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Collect matching run IDs across paginated workflow-run results.
   */
  private collectMatchingRunIdentifiers(options: {
    readonly filters?: WorkflowRunFilters;
    readonly githubRepository: string;
    readonly shouldDeleteRun: (runSummary: WorkflowRun) => boolean;
    readonly shouldStopCollecting?: (pageRuns: WorkflowRun[]) => boolean;
  }): string[] {
    const runIdentifiers: string[] = [];
    let pageNumber = 1;

    for (;;) {
      const pageRuns = this.loadWorkflowRunsPage(
        options.githubRepository,
        pageNumber,
        options.filters,
      );
      if (pageRuns.length === 0) {
        break;
      }

      for (const runSummary of pageRuns) {
        if (options.shouldDeleteRun(runSummary)) {
          runIdentifiers.push(runSummary.id.toString());
        }
      }

      if (options.shouldStopCollecting?.(pageRuns) ?? false) {
        break;
      }

      pageNumber += 1;
    }

    return runIdentifiers;
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
   * Load one paginated workflow-runs API page.
   */
  private loadWorkflowRunsPage(
    githubRepository: string,
    pageNumber: number,
    filters: WorkflowRunFilters = {},
  ): WorkflowRun[] {
    const response = this.parseWorkflowRunsResponse(
      this.runGithubApiJson(
        buildWorkflowRunsUrl(githubRepository, pageNumber, filters),
      ),
    );
    return response.workflow_runs;
  }

  /**
   * Parse workflow-runs response payload.
   */
  private parseWorkflowRunsResponse(value: unknown): WorkflowRunsResponse {
    return workflowRunsResponseSchema.parse(value);
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
   * Execute a GitHub API call and parse JSON output.
   */
  private runGithubApiJson(
    apiPath: string,
    argumentsList: string[] = [],
  ): unknown {
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
   * Determine whether pagination can stop before reaching the cutoff.
   */
  private shouldStopPagination(
    pageRuns: WorkflowRun[],
    cutoffDate: string,
  ): boolean {
    const lastCreatedAt = pageRuns.at(-1)?.created_at;
    return lastCreatedAt !== undefined && lastCreatedAt < cutoffDate;
  }

  /**
   * Delete a single workflow run by ID.
   */
  protected deleteRun(githubRepository: string, runIdentifier: string): void {
    this.runCommandChecked(
      "gh",
      [
        "api",
        "--method",
        "DELETE",
        `repos/${githubRepository}/actions/runs/${runIdentifier}`,
      ],
      `delete run ${runIdentifier}`,
    );
  }

  // 🌎 Public Methods

  /**
   * Delete all runs older than the requested end date, using pagination.
   */
  deleteRunsBeforeEnd(
    githubRepository: string,
    deleteEnd: string,
    filters: WorkflowRunFilters = {},
  ): void {
    const runIdentifiers = this.collectMatchingRunIdentifiers({
      filters,
      githubRepository,
      shouldDeleteRun: (runSummary): boolean =>
        runSummary.created_at < deleteEnd,
    });

    for (const runIdentifier of runIdentifiers) {
      this.deleteRun(githubRepository, runIdentifier);
    }
  }

  /**
   * Delete all runs that fall within the archive window.
   */
  deleteRunsInWindow(
    githubRepository: string,
    deleteWindow: {
      readonly deleteEnd: string;
      readonly deleteStart: string;
    },
    filters: WorkflowRunFilters = {},
  ): void {
    const runIdentifiers = this.collectMatchingRunIdentifiers({
      filters,
      githubRepository,
      shouldDeleteRun: (runSummary): boolean =>
        runSummary.created_at >= deleteWindow.deleteStart &&
        runSummary.created_at < deleteWindow.deleteEnd,
      shouldStopCollecting: (pageRuns): boolean =>
        this.shouldStopPagination(pageRuns, deleteWindow.deleteStart),
    });

    for (const runIdentifier of runIdentifiers) {
      this.deleteRun(githubRepository, runIdentifier);
    }
  }
}
