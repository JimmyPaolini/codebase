import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ArchiveLogsShellService } from "./archive-logs-shell.service";
import {
  ARCHIVE_BRANCH,
  INDEX_FILE_RELATIVE_PATH,
} from "./archive-logs.constants";
import { ArchiveLogsService } from "./archive-logs.service";
import { buildWorkflowRunsUrl } from "./workflow-runs.utilities.js";

type ArchiveLogsShellServiceTestDouble = Omit<
  ArchiveLogsShellService,
  "runGithubApiJson"
> & {
  runGithubApiJson: ArchiveLogsShellService["runGithubApiJson"] | undefined;
};

describe(ArchiveLogsService, () => {
  let service: ArchiveLogsService;
  let archiveLogsSupportService: ArchiveLogsShellService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArchiveLogsService,
        {
          provide: ArchiveLogsShellService,
          useValue: createMock<ArchiveLogsShellService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ArchiveLogsService);
    archiveLogsSupportService = await module.resolve(ArchiveLogsShellService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    (
      archiveLogsSupportService as ArchiveLogsShellServiceTestDouble
    ).runGithubApiJson = undefined;
    vi.mocked(archiveLogsSupportService.buildArchiveName).mockReturnValue(
      "archive-2025-01-01T00-00-00Z__2025-01-08T00-00-00Z",
    );
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildContext", () => {
    it("returns a context with archive constants and normalized paths", () => {
      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );

      expect(context.archiveBranch).toBe(ARCHIVE_BRANCH);
      expect(context.indexFileRelativePath).toBe(INDEX_FILE_RELATIVE_PATH);
      expect(context.archiveFileRelativePath).toMatch(/^archives\/2025\//);
      expect(context.archiveFileRelativePath).toMatch(/\.zip$/);
    });
  });

  describe("archiveAlreadyExists", () => {
    it("returns true when github api path exists", () => {
      vi.mocked(archiveLogsSupportService.githubApiExists).mockReturnValue(
        true,
      );
      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );

      expect(service.archiveAlreadyExists("owner/repo", context)).toBe(true);
    });

    it("returns false when github api path is missing", () => {
      vi.mocked(archiveLogsSupportService.githubApiExists).mockReturnValue(
        false,
      );
      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );

      expect(service.archiveAlreadyExists("owner/repo", context)).toBe(false);
    });
  });

  describe("collectAndZip", () => {
    it("returns empty run identifiers when no pages are available", () => {
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          initializeWorkspace: (archiveContext: unknown) => void;
        },
        "initializeWorkspace",
      ).mockReturnValue(undefined);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          loadArchivedRunIdentifierSet: (
            githubRepository: string,
            archiveContext: unknown,
          ) => Set<string>;
        },
        "loadArchivedRunIdentifierSet",
      ).mockReturnValue(new Set<string>());
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          loadWorkflowRunsPage: (
            githubRepository: string,
            pageNumber: number,
          ) => { created_at: string; id: number }[];
        },
        "loadWorkflowRunsPage",
      ).mockReturnValue([]);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          finalizeArchive: (options: unknown) => void;
        },
        "finalizeArchive",
      ).mockReturnValue(undefined);

      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );
      const result = service.collectAndZip("owner/repo", context, {});

      expect(result).toStrictEqual({ includedRunIds: [], skippedRunIds: [] });
    });

    it("loads filtered runs from the workflow-specific endpoint when name is set", () => {
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          initializeWorkspace: (archiveContext: unknown) => void;
        },
        "initializeWorkspace",
      ).mockReturnValue(undefined);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          loadArchivedRunIdentifierSet: (
            githubRepository: string,
            archiveContext: unknown,
          ) => Set<string>;
        },
        "loadArchivedRunIdentifierSet",
      ).mockReturnValue(new Set<string>());
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          collectRunsFromPage: (options: unknown) => void;
        },
        "collectRunsFromPage",
      ).mockReturnValue(undefined);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          finalizeArchive: (options: unknown) => void;
        },
        "finalizeArchive",
      ).mockReturnValue(undefined);
      const runGithubApiJsonSpy = vi
        .fn<ArchiveLogsShellService["runGithubApiJson"]>()
        .mockReturnValueOnce({
          workflow_runs: [
            { created_at: "2025-01-07T00:00:00Z", id: 1, name: "nightly.yml" },
          ],
        })
        .mockReturnValueOnce({ workflow_runs: [] });
      (
        archiveLogsSupportService as ArchiveLogsShellServiceTestDouble
      ).runGithubApiJson = runGithubApiJsonSpy;

      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );
      service.collectAndZip("owner/repo", context, { name: "nightly.yml" });

      expect(runGithubApiJsonSpy).toHaveBeenNthCalledWith(
        1,
        buildWorkflowRunsUrl("owner/repo", 1, { name: "nightly.yml" }),
      );
    });

    it("keeps date-window pagination working with filters applied", () => {
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          initializeWorkspace: (archiveContext: unknown) => void;
        },
        "initializeWorkspace",
      ).mockReturnValue(undefined);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          loadArchivedRunIdentifierSet: (
            githubRepository: string,
            archiveContext: unknown,
          ) => Set<string>;
        },
        "loadArchivedRunIdentifierSet",
      ).mockReturnValue(new Set<string>());
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          collectRunsFromPage: (options: unknown) => void;
        },
        "collectRunsFromPage",
      ).mockReturnValue(undefined);
      vi.spyOn(
        // type-coverage:ignore-next-line
        service as unknown as {
          finalizeArchive: (options: unknown) => void;
        },
        "finalizeArchive",
      ).mockReturnValue(undefined);
      const runGithubApiJsonSpy = vi
        .fn<ArchiveLogsShellService["runGithubApiJson"]>()
        .mockReturnValueOnce({
          workflow_runs: [
            { created_at: "2025-01-07T00:00:00Z", id: 1 },
            { created_at: "2025-01-05T00:00:00Z", id: 2 },
          ],
        })
        .mockReturnValueOnce({
          workflow_runs: [{ created_at: "2024-12-31T23:00:00Z", id: 3 }],
        });
      (
        archiveLogsSupportService as ArchiveLogsShellServiceTestDouble
      ).runGithubApiJson = runGithubApiJsonSpy;

      const filters = {
        actor: "robot",
        branch: "main",
        event: "push",
        status: "completed",
      };
      const context = service.buildContext(
        "2025-01-01T00:00:00Z",
        "2025-01-08T00:00:00Z",
      );
      service.collectAndZip("owner/repo", context, filters);

      expect(runGithubApiJsonSpy).toHaveBeenNthCalledWith(
        1,
        buildWorkflowRunsUrl("owner/repo", 1, filters),
      );
      expect(runGithubApiJsonSpy).toHaveBeenNthCalledWith(
        2,
        buildWorkflowRunsUrl("owner/repo", 2, filters),
      );
    });

    it("resets the workflow-runs api stub between tests", () => {
      expect(archiveLogsSupportService.runGithubApiJson).toBeUndefined();
    });
  });
});
