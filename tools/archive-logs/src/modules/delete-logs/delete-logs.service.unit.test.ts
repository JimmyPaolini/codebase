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
      .mockReturnValueOnce("")
      .mockReturnValueOnce("")
      .mockReturnValueOnce(
        JSON.stringify({
          workflow_runs: [{ created_at: "2024-12-31T23:00:00Z", id: 3 }],
        }),
      );

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
});
