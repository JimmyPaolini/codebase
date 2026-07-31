import type { WorkflowRunFilters } from "./archive-logs.types.js";

/**
 * Build the GitHub API path for listing workflow runs.
 */
export function buildWorkflowRunsUrl(
  githubRepository: string,
  pageNumber: number,
  filters: WorkflowRunFilters = {},
): string {
  const workflowRunsPath =
    filters.name === undefined
      ? `repos/${githubRepository}/actions/runs`
      : `repos/${githubRepository}/actions/workflows/${encodeURIComponent(filters.name)}/runs`;
  const queryParameters = new URLSearchParams({
    page: pageNumber.toString(),
    per_page: "100",
  });

  if (filters.status !== undefined) {
    queryParameters.set("status", filters.status);
  }
  if (filters.event !== undefined) {
    queryParameters.set("event", filters.event);
  }
  if (filters.branch !== undefined) {
    queryParameters.set("branch", filters.branch);
  }
  if (filters.actor !== undefined) {
    queryParameters.set("actor", filters.actor);
  }

  return `${workflowRunsPath}?${queryParameters.toString()}`;
}
