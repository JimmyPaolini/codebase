import type { WorkflowRunFilters } from "../archive-logs/archive-logs.types.js";

// 🏷️ Types

/**
 * Validated delete command options and required environment values.
 */
export interface DeleteLogsOptions {
  readonly deleteEnd: string;
  readonly deleteStart?: string;
  readonly filters: WorkflowRunFilters;
  readonly githubRepository: string;
  readonly githubToken: string;
}
