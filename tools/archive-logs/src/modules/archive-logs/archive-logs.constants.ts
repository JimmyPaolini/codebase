import { z } from "zod";

// ♟️ Constants

/** Branch where archives are stored. */
export const ARCHIVE_BRANCH = "chore/deployments-archive-logs";

/** Path within the archive branch for the run ID index. */
export const INDEX_FILE_RELATIVE_PATH = "index/archived-run-ids.jsonl";

// 🔍 Zod Schemas

/** Zod schema for a single workflow run entry. */
export const workflowRunSchema = z.object({
  created_at: z.string(),
  id: z.number(),
});

/** Zod schema for the workflow-runs list API response. */
export const workflowRunsResponseSchema = z.object({
  workflow_runs: z.array(workflowRunSchema),
});

/** Zod schema for the artifacts list API response. */
export const artifactResponseSchema = z.object({
  total_count: z.number(),
});
