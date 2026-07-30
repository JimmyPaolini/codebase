import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ArchiveLogsShellService } from "./archive-logs-shell.service";
import {
  ARCHIVE_BRANCH,
  INDEX_FILE_RELATIVE_PATH,
} from "./archive-logs.constants";
import { ArchiveLogsService } from "./archive-logs.service";

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
    vi.clearAllMocks();
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
      const result = service.collectAndZip("owner/repo", context);

      expect(result).toStrictEqual({ includedRunIds: [], skippedRunIds: [] });
    });
  });
});
