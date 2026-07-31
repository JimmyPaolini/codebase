import { describe, expect, it } from "vitest";

import { workflowRunSchema } from "./archive-logs.constants.js";
import { buildWorkflowRunsUrl } from "./workflow-runs.utilities.js";

describe("workflow-runs utilities", () => {
  describe(buildWorkflowRunsUrl, () => {
    it("uses the repository-wide runs endpoint when no workflow name is provided", () => {
      const url = new URL(
        buildWorkflowRunsUrl("owner/repository", 2),
        "https://api.github.com",
      );

      expect(url.pathname).toBe("/repos/owner/repository/actions/runs");
      expect(url.searchParams.get("page")).toBe("2");
      expect(url.searchParams.get("per_page")).toBe("100");
      expect(url.searchParams.get("status")).toBeNull();
    });

    it("switches to the per-workflow endpoint when name is provided", () => {
      const url = new URL(
        buildWorkflowRunsUrl("owner/repository", 3, { name: "nightly.yml" }),
        "https://api.github.com",
      );

      expect(url.pathname).toBe(
        "/repos/owner/repository/actions/workflows/nightly.yml/runs",
      );
      expect(url.searchParams.get("page")).toBe("3");
      expect(url.searchParams.get("per_page")).toBe("100");
    });

    it("appends status, event, branch, and actor query parameters", () => {
      const url = new URL(
        buildWorkflowRunsUrl("owner/repository", 4, {
          actor: "robot",
          branch: "main",
          event: "push",
          status: "completed",
        }),
        "https://api.github.com",
      );

      expect(url.searchParams.get("status")).toBe("completed");
      expect(url.searchParams.get("event")).toBe("push");
      expect(url.searchParams.get("branch")).toBe("main");
      expect(url.searchParams.get("actor")).toBe("robot");
    });
  });

  describe("workflowRunSchema", () => {
    it("parses the workflow run name field", () => {
      expect(
        workflowRunSchema.parse({
          created_at: "2025-01-01T00:00:00Z",
          id: 1,
          name: "nightly.yml",
        }).name,
      ).toBe("nightly.yml");
    });
  });
});
