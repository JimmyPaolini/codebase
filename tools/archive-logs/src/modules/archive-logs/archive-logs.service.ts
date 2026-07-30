import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { ArchiveLogsShellService } from "./archive-logs-shell.service";
import {
  ARCHIVE_BRANCH,
  artifactResponseSchema,
  INDEX_FILE_RELATIVE_PATH,
  workflowRunsResponseSchema,
} from "./archive-logs.constants";

import type {
  ArchiveContext,
  ArtifactResponse,
  Manifest,
  RunCollectionResult,
  WorkflowRun,
  WorkflowRunsResponse,
} from "./archive-logs.types";

/**
 * Service that collects and zips workflow runs for an archive window.
 */
@Injectable()
export class ArchiveLogsService {
  // 🏗 Dependency Injection

  constructor(
    private readonly archiveLogsSupportService: ArchiveLogsShellService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Add a newly archived run identifier to tracking files.
   */
  private appendArchivedRunIdentifier(
    archiveContext: ArchiveContext,
    runIdentifier: string,
  ): void {
    const jsonLineEntry = `{"run_id":${runIdentifier}}\n`;
    this.archiveLogsSupportService.writeTextFile(
      archiveContext.newlyArchivedRunIdentifiersPath,
      `${this.archiveLogsSupportService.readExistingText(archiveContext.newlyArchivedRunIdentifiersPath)}${jsonLineEntry}`,
    );
    this.archiveLogsSupportService.writeTextFile(
      archiveContext.newlyArchivedRunIdentifiersOnlyPath,
      `${this.archiveLogsSupportService.readExistingText(archiveContext.newlyArchivedRunIdentifiersOnlyPath)}${runIdentifier}\n`,
    );
  }

  /**
   * Archive one workflow run's metadata, logs, and artifacts.
   */
  private archiveWorkflowRun(
    githubRepository: string,
    runSummary: WorkflowRun,
    archiveContext: ArchiveContext,
  ): void {
    const runIdentifier = runSummary.id.toString();
    const runDirectoryPath = path.join(
      archiveContext.archiveDirectoryPath,
      "runs",
      runIdentifier,
    );
    const artifactsDirectoryPath = path.join(runDirectoryPath, "artifacts");

    mkdirSync(artifactsDirectoryPath, { recursive: true });
    this.archiveLogsSupportService.writeTextFile(
      path.join(runDirectoryPath, "metadata.json"),
      this.archiveLogsSupportService.runGithubApiText(
        `repos/${githubRepository}/actions/runs/${runIdentifier}`,
      ),
    );
    this.archiveLogsSupportService.writeTextFile(
      path.join(runDirectoryPath, "logs.txt"),
      this.archiveLogsSupportService.runCommandChecked(
        "gh",
        ["run", "view", runIdentifier, "--repo", githubRepository, "--log"],
        `gh run view ${runIdentifier}`,
      ),
    );

    const artifactResponse = this.parseArtifactResponse(
      this.archiveLogsSupportService.runGithubApiJson(
        `repos/${githubRepository}/actions/runs/${runIdentifier}/artifacts`,
      ),
    );
    if (artifactResponse.total_count > 0) {
      this.archiveLogsSupportService.runCommandChecked(
        "gh",
        [
          "run",
          "download",
          runIdentifier,
          "--repo",
          githubRepository,
          "--dir",
          artifactsDirectoryPath,
        ],
        `gh run download ${runIdentifier}`,
      );
    }

    this.appendArchivedRunIdentifier(archiveContext, runIdentifier);
  }

  /**
   * Collect eligible runs from one page and archive them.
   */
  private collectRunsFromPage(options: {
    readonly archiveContext: ArchiveContext;
    readonly archivedRunIdentifierSet: Set<string>;
    readonly archiveEnd: string;
    readonly archiveStart: string;
    readonly githubRepository: string;
    readonly includedRunIds: number[];
    readonly pageRuns: WorkflowRun[];
    readonly skippedRunIds: number[];
  }): void {
    for (const runSummary of options.pageRuns) {
      if (
        !this.isRunWithinWindow(
          runSummary,
          options.archiveStart,
          options.archiveEnd,
        )
      ) {
        continue;
      }

      const runIdentifier = runSummary.id.toString();
      if (options.archivedRunIdentifierSet.has(runIdentifier)) {
        options.skippedRunIds.push(runSummary.id);
        continue;
      }

      this.archiveWorkflowRun(
        options.githubRepository,
        runSummary,
        options.archiveContext,
      );
      options.archivedRunIdentifierSet.add(runIdentifier);
      options.includedRunIds.push(runSummary.id);
    }
  }

  /**
   * Write manifest JSON and zip the archive directory.
   */
  private finalizeArchive(options: {
    readonly archiveContext: ArchiveContext;
    readonly archiveEnd: string;
    readonly archiveStart: string;
    readonly githubRepository: string;
    readonly includedRunIds: number[];
    readonly skippedRunIds: number[];
  }): void {
    const manifest: Manifest = {
      archive_created_at: new Date().toISOString().replace(".000Z", "Z"),
      archive_name: options.archiveContext.archiveName,
      included_run_ids: options.includedRunIds,
      repository: options.githubRepository,
      skipped_run_ids: options.skippedRunIds,
      window_end: options.archiveEnd,
      window_start: options.archiveStart,
    };

    this.archiveLogsSupportService.writeJsonFile(
      path.join(options.archiveContext.archiveDirectoryPath, "manifest.json"),
      manifest,
    );
    this.archiveLogsSupportService.runCommandChecked(
      "zip",
      [
        "-X",
        "-qr",
        options.archiveContext.archiveZipPath,
        options.archiveContext.archiveName,
      ],
      {
        failureLabel: "zip archive",
        spawnConfiguration: {
          cwd: options.archiveContext.archiveBaseDirectoryPath,
        },
      },
    );
  }

  /**
   * Prepare a clean workspace for the current archive execution.
   */
  private initializeWorkspace(archiveContext: ArchiveContext): void {
    mkdirSync(archiveContext.archiveBaseDirectoryPath, { recursive: true });
    rmSync(archiveContext.archiveDirectoryPath, {
      force: true,
      recursive: true,
    });
    rmSync(archiveContext.archiveZipPath, { force: true });
    mkdirSync(path.join(archiveContext.archiveDirectoryPath, "runs"), {
      recursive: true,
    });

    this.archiveLogsSupportService.writeTextFile(
      archiveContext.alreadyArchivedRunIdentifiersPath,
      "",
    );
    this.archiveLogsSupportService.writeTextFile(
      archiveContext.newlyArchivedRunIdentifiersOnlyPath,
      "",
    );
    this.archiveLogsSupportService.writeTextFile(
      archiveContext.newlyArchivedRunIdentifiersPath,
      "",
    );
  }

  /**
   * Check whether a run timestamp falls within [start, end).
   */
  private isRunWithinWindow(
    runSummary: WorkflowRun,
    archiveStart: string,
    archiveEnd: string,
  ): boolean {
    return (
      runSummary.created_at >= archiveStart &&
      runSummary.created_at < archiveEnd
    );
  }

  /**
   * Load previously archived run IDs from the archive index on the storage branch.
   */
  private loadArchivedRunIdentifierSet(
    githubRepository: string,
    archiveContext: ArchiveContext,
  ): Set<string> {
    const archivedRunIdentifierSet = new Set<string>();
    const indexPath = `repos/${githubRepository}/contents/${archiveContext.indexFileRelativePath}?ref=${archiveContext.archiveBranch}`;
    if (!this.archiveLogsSupportService.githubApiExists(indexPath)) {
      return archivedRunIdentifierSet;
    }

    const encodedContent = this.archiveLogsSupportService
      .runGithubApiText(indexPath, ["--jq", ".content"])
      .trim();
    const decodedContent = Buffer.from(encodedContent, "base64").toString(
      "utf8",
    );
    const runIdentifierEntries = decodedContent
      .split(/\r?\n/)
      .filter((lineValue) => lineValue !== "")
      .map((lineValue) => JSON.parse(lineValue) as { run_id?: number })
      .map((entryValue) => entryValue.run_id?.toString())
      .filter(
        (runIdentifier): runIdentifier is string => runIdentifier !== undefined,
      );

    for (const runIdentifier of runIdentifierEntries) {
      archivedRunIdentifierSet.add(runIdentifier);
    }

    this.archiveLogsSupportService.writeTextFile(
      archiveContext.alreadyArchivedRunIdentifiersPath,
      this.archiveLogsSupportService
        .readLines(archiveContext.alreadyArchivedRunIdentifiersPath)
        .join("\n"),
    );

    return archivedRunIdentifierSet;
  }

  /**
   * Load one paginated workflow-runs API page.
   */
  private loadWorkflowRunsPage(
    githubRepository: string,
    pageNumber: number,
  ): WorkflowRun[] {
    const response = this.parseWorkflowRunsResponse(
      this.archiveLogsSupportService.runGithubApiJson(
        `repos/${githubRepository}/actions/runs?per_page=100&page=${pageNumber}`,
      ),
    );
    return response.workflow_runs;
  }

  /**
   * Parse artifact response payload using Zod schema.
   */
  private parseArtifactResponse(value: unknown): ArtifactResponse {
    return artifactResponseSchema.parse(value);
  }

  /**
   * Parse workflow-runs response payload using Zod schema.
   */
  private parseWorkflowRunsResponse(value: unknown): WorkflowRunsResponse {
    return workflowRunsResponseSchema.parse(value);
  }

  /**
   * Determine whether pagination can stop.
   */
  private shouldStopPagination(
    pageRuns: WorkflowRun[],
    archiveStart: string,
  ): boolean {
    const lastCreatedAt = pageRuns.at(-1)?.created_at;
    return lastCreatedAt !== undefined && lastCreatedAt < archiveStart;
  }

  // 🌎 Public Methods

  /**
   * Check whether an exact archive for this window already exists on the branch.
   */
  archiveAlreadyExists(
    githubRepository: string,
    archiveContext: ArchiveContext,
  ): boolean {
    const exactArchivePath = `repos/${githubRepository}/contents/${archiveContext.archiveFileRelativePath}?ref=${archiveContext.archiveBranch}`;
    return this.archiveLogsSupportService.githubApiExists(exactArchivePath);
  }

  /**
   * Build the archive context paths from a normalized window.
   */
  buildContext(archiveStart: string, archiveEnd: string): ArchiveContext {
    const archiveName = this.archiveLogsSupportService.buildArchiveName(
      archiveStart,
      archiveEnd,
    );
    const archiveBaseDirectoryPath = path.join(
      process.cwd(),
      "tmp",
      "archive-logs",
    );
    const archiveDirectoryPath = path.join(
      archiveBaseDirectoryPath,
      archiveName,
    );

    return {
      alreadyArchivedRunIdentifiersPath: path.join(
        archiveBaseDirectoryPath,
        "already-archived-run-ids.txt",
      ),
      archiveBaseDirectoryPath,
      archiveBranch: ARCHIVE_BRANCH,
      archiveDirectoryPath,
      archiveEnd,
      archiveFileRelativePath: path
        .join("archives", archiveStart.slice(0, 4), `${archiveName}.zip`)
        .replaceAll("\\", "/"),
      archiveName,
      archiveStart,
      archiveZipPath: path.join(archiveBaseDirectoryPath, `${archiveName}.zip`),
      indexFileRelativePath: INDEX_FILE_RELATIVE_PATH,
      newlyArchivedRunIdentifiersOnlyPath: path.join(
        archiveBaseDirectoryPath,
        "newly-archived-run-ids.txt",
      ),
      newlyArchivedRunIdentifiersPath: path.join(
        archiveBaseDirectoryPath,
        "newly-archived-run-ids.jsonl",
      ),
    };
  }

  /**
   * Collect and zip all runs in [start, end), skipping previously archived run IDs.
   */
  collectAndZip(
    githubRepository: string,
    archiveContext: ArchiveContext,
  ): RunCollectionResult {
    this.initializeWorkspace(archiveContext);

    const archivedRunIdentifierSet = this.loadArchivedRunIdentifierSet(
      githubRepository,
      archiveContext,
    );

    const includedRunIds: number[] = [];
    const skippedRunIds: number[] = [];
    let pageNumber = 1;

    for (;;) {
      const pageRuns = this.loadWorkflowRunsPage(githubRepository, pageNumber);
      if (pageRuns.length === 0) {
        break;
      }

      this.collectRunsFromPage({
        archiveContext,
        archivedRunIdentifierSet,
        archiveEnd: archiveContext.archiveEnd,
        archiveStart: archiveContext.archiveStart,
        githubRepository,
        includedRunIds,
        pageRuns,
        skippedRunIds,
      });

      if (this.shouldStopPagination(pageRuns, archiveContext.archiveStart)) {
        break;
      }

      pageNumber += 1;
    }

    this.finalizeArchive({
      archiveContext,
      archiveEnd: archiveContext.archiveEnd,
      archiveStart: archiveContext.archiveStart,
      githubRepository,
      includedRunIds,
      skippedRunIds,
    });

    return { includedRunIds, skippedRunIds };
  }
}
