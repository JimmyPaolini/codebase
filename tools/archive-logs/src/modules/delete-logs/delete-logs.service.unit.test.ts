import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildWorkflowRunsUrl } from "../archive-logs/workflow-runs.utilities.js";

import { DeleteLogsService } from "./delete-logs.service";

interface DeleteLogsServicePrivate {
  runCommandChecked: (
    command: string,
    argumentsList: string[],
    optionsOrFailureLabel?:
      | string
      | {
          readonly failureLabel?: string;
          readonly spawnConfiguration?: Record<string, unknown>;
        },
  ) => string;
}

describe(DeleteLogsService, () => {
  let service: DeleteLogsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DeleteLogsService],
    }).compile();

    service = await module.resolve(DeleteLogsService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("loads filtered runs from the workflow-specific endpoint when name is set", () => {
    const runCommandCheckedSpy = vi
      .spyOn(
        // type-coverage:ignore-next-line
        service as unknown as DeleteLogsServicePrivate,
        "runCommandChecked",
      )
      .mockReturnValueOnce(
        JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-07T00:00:00Z", id: 1, name: "nightly.yml" },
          ],
        }),
      )
      .mockReturnValueOnce(
        JSON.stringify({
          workflow_runs: [],
        }),
      )
      .mockReturnValueOnce("");

    service.deleteRunsBeforeEnd("owner/repo", "2025-01-08T00:00:00Z", {
      name: "nightly.yml",
    });

    const listApiCalls = runCommandCheckedSpy.mock.calls.filter(
      (callEntry): boolean => {
        const argumentsList = callEntry[1];
        return (
          argumentsList[0] === "api" && !argumentsList.includes("--method")
        );
      },
    );

    expect(listApiCalls).toStrictEqual([
      [
        "gh",
        ["api", buildWorkflowRunsUrl("owner/repo", 1, { name: "nightly.yml" })],
        {
          failureLabel: `gh api ${buildWorkflowRunsUrl("owner/repo", 1, { name: "nightly.yml" })}`,
        },
      ],
      [
        "gh",
        ["api", buildWorkflowRunsUrl("owner/repo", 2, { name: "nightly.yml" })],
        {
          failureLabel: `gh api ${buildWorkflowRunsUrl("owner/repo", 2, { name: "nightly.yml" })}`,
        },
      ],
    ]);
  });

  it("keeps delete pagination working with filters applied", () => {
    const filters = {
      actor: "robot",
      branch: "main",
      event: "push",
      status: "completed",
    };
    const runCommandCheckedSpy = vi
      .spyOn(
        // type-coverage:ignore-next-line
        service as unknown as DeleteLogsServicePrivate,
        "runCommandChecked",
      )
      .mockReturnValueOnce(
        JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-07T00:00:00Z", id: 1 },
            { created_at: "2025-01-05T00:00:00Z", id: 2 },
          ],
        }),
      )
      .mockReturnValueOnce(
        JSON.stringify({
          workflow_runs: [{ created_at: "2024-12-31T23:00:00Z", id: 3 }],
        }),
      )
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce("");

    service.deleteRunsInWindow(
      "owner/repo",
      {
        deleteEnd: "2025-01-08T00:00:00Z",
        deleteStart: "2025-01-01T00:00:00Z",
      },
      filters,
    );

    const listApiCalls = runCommandCheckedSpy.mock.calls.filter(
      (callEntry): boolean => {
        const argumentsList = callEntry[1];
        return (
          argumentsList[0] === "api" && !argumentsList.includes("--method")
        );
      },
    );

    expect(listApiCalls).toStrictEqual([
      [
        "gh",
        ["api", buildWorkflowRunsUrl("owner/repo", 1, filters)],
        {
          failureLabel: `gh api ${buildWorkflowRunsUrl("owner/repo", 1, filters)}`,
        },
      ],
      [
        "gh",
        ["api", buildWorkflowRunsUrl("owner/repo", 2, filters)],
        {
          failureLabel: `gh api ${buildWorkflowRunsUrl("owner/repo", 2, filters)}`,
        },
      ],
    ]);
  });

  it("collects all eligible before-end runs before deleting them", () => {
    const operations: string[] = [];
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as DeleteLogsServicePrivate,
      "runCommandChecked",
    ).mockImplementation((unusedCommand, argumentsList) => {
      void unusedCommand;
      if (argumentsList[0] !== "api") {
        return "";
      }

      if (argumentsList.includes("--method")) {
        operations.push(`delete:${argumentsList.at(-1) ?? ""}`);
        return "";
      }

      const apiPath = argumentsList[1];
      operations.push(`list:${apiPath}`);

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 1)) {
        return JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-10T00:00:00Z", id: 1 },
            { created_at: "2025-01-09T00:00:00Z", id: 2 },
          ],
        });
      }

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 2)) {
        return JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-08T11:00:00Z", id: 3 },
            { created_at: "2025-01-08T10:00:00Z", id: 4 },
          ],
        });
      }

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 3)) {
        return JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-08T09:00:00Z", id: 5 },
            { created_at: "2025-01-08T08:00:00Z", id: 6 },
          ],
        });
      }

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 4)) {
        return JSON.stringify({
          workflow_runs: [],
        });
      }

      throw new Error(`Unexpected API path: ${apiPath ?? "<missing>"}`);
    });
    service.deleteRunsBeforeEnd("owner/repo", "2025-01-08T12:00:00Z");

    expect(operations).toStrictEqual([
      `list:${buildWorkflowRunsUrl("owner/repo", 1)}`,
      `list:${buildWorkflowRunsUrl("owner/repo", 2)}`,
      `list:${buildWorkflowRunsUrl("owner/repo", 3)}`,
      `list:${buildWorkflowRunsUrl("owner/repo", 4)}`,
      "delete:repos/owner/repo/actions/runs/3",
      "delete:repos/owner/repo/actions/runs/4",
      "delete:repos/owner/repo/actions/runs/5",
      "delete:repos/owner/repo/actions/runs/6",
    ]);
  });

  it("collects all in-window runs before deleting them", () => {
    const operations: string[] = [];
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as DeleteLogsServicePrivate,
      "runCommandChecked",
    ).mockImplementation((unusedCommand, argumentsList) => {
      void unusedCommand;
      if (argumentsList[0] !== "api") {
        return "";
      }

      if (argumentsList.includes("--method")) {
        operations.push(`delete:${argumentsList.at(-1) ?? ""}`);
        return "";
      }

      const apiPath = argumentsList[1];
      operations.push(`list:${apiPath}`);

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 1)) {
        return JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-07T00:00:00Z", id: 1 },
            { created_at: "2025-01-06T00:00:00Z", id: 2 },
          ],
        });
      }

      if (apiPath === buildWorkflowRunsUrl("owner/repo", 2)) {
        return JSON.stringify({
          workflow_runs: [
            { created_at: "2025-01-05T00:00:00Z", id: 3 },
            { created_at: "2025-01-03T00:00:00Z", id: 4 },
          ],
        });
      }

      throw new Error(`Unexpected API path: ${apiPath ?? "<missing>"}`);
    });

    service.deleteRunsInWindow("owner/repo", {
      deleteEnd: "2025-01-08T00:00:00Z",
      deleteStart: "2025-01-04T00:00:00Z",
    });

    expect(operations).toStrictEqual([
      `list:${buildWorkflowRunsUrl("owner/repo", 1)}`,
      `list:${buildWorkflowRunsUrl("owner/repo", 2)}`,
      "delete:repos/owner/repo/actions/runs/1",
      "delete:repos/owner/repo/actions/runs/2",
      "delete:repos/owner/repo/actions/runs/3",
    ]);
  });
});
