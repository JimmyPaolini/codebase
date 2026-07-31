// 🏷️ Types

/**
 * Derived paths and constants for one archive execution window.
 */
export interface ArchiveContext {
  readonly alreadyArchivedRunIdentifiersPath: string;
  readonly archiveBaseDirectoryPath: string;
  readonly archiveBranch: string;
  readonly archiveDirectoryPath: string;
  readonly archiveEnd: string;
  readonly archiveFileRelativePath: string;
  readonly archiveName: string;
  readonly archiveStart: string;
  readonly archiveZipPath: string;
  readonly indexFileRelativePath: string;
  readonly newlyArchivedRunIdentifiersOnlyPath: string;
  readonly newlyArchivedRunIdentifiersPath: string;
}

/**
 * Validated command options and required environment values.
 */
export interface ArchiveLogsOptions {
  readonly archiveEnd: string;
  readonly archiveStart: string;
  readonly filters: WorkflowRunFilters;
  readonly githubRepository: string;
  readonly githubToken: string;
}

/**
 * Artifact list response from GitHub Actions API.
 */
export interface ArtifactResponse {
  readonly total_count: number;
}

/**
 * Spawned process result.
 */
export interface CommandResult {
  readonly standardError: string;
  readonly standardOutput: string;
  readonly status: null | number;
}

/**
 * Archive manifest contents.
 */
export interface Manifest {
  readonly archive_created_at: string;
  readonly archive_name: string;
  readonly included_run_ids: number[];
  readonly repository: string;
  readonly skipped_run_ids: number[];
  readonly window_end: string;
  readonly window_start: string;
}

/**
 * Collected run IDs after one archive pass.
 */
export interface RunCollectionResult {
  readonly includedRunIds: number[];
  readonly skippedRunIds: number[];
}

/**
 * Workflow run entry from GitHub Actions list endpoint.
 */
export interface WorkflowRun {
  readonly created_at: string;
  readonly id: number;
  readonly name?: string | undefined;
}

/**
 * Shared filters for GitHub Actions workflow run list requests.
 */
export interface WorkflowRunFilters {
  readonly actor?: string;
  readonly branch?: string;
  readonly event?: string;
  readonly name?: string;
  readonly status?: string;
}

/**
 * Workflow run list response from GitHub Actions API.
 */
export interface WorkflowRunsResponse {
  readonly workflow_runs: WorkflowRun[];
}
