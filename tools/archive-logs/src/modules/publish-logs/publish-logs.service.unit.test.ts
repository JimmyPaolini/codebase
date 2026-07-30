import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { PublishLogsService } from "./publish-logs.service";

import type { mkdirSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  mkdirSync: vi.fn<typeof mkdirSync>(),
}));

vi.mock("node:fs", async () => {
  const actual = await import("node:fs");
  return {
    ...actual,
    mkdirSync: mocks.mkdirSync,
  };
});

describe(PublishLogsService, () => {
  let service: PublishLogsService;
  let logger: LoggerService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PublishLogsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    service = await module.resolve(PublishLogsService);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("publishes archive files to the configured branch", () => {
    const archiveContext = {
      alreadyArchivedRunIdentifiersPath: "/tmp/already.txt",
      archiveBaseDirectoryPath: "/tmp/base",
      archiveBranch: "chore/deployments-archive-logs",
      archiveDirectoryPath: "/tmp/dir",
      archiveEnd: "2025-01-08T00:00:00Z",
      archiveFileRelativePath: "archives/2025/archive.zip",
      archiveName: "archive-2025-01-01T00-00-00Z__2025-01-08T00-00-00Z",
      archiveStart: "2025-01-01T00:00:00Z",
      archiveZipPath: "/tmp/archive.zip",
      indexFileRelativePath: "index/archived-run-ids.jsonl",
      newlyArchivedRunIdentifiersOnlyPath: "/tmp/new-ids.txt",
      newlyArchivedRunIdentifiersPath: "/tmp/new-ids.jsonl",
    };

    mocks.mkdirSync.mockReturnValue(undefined);
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as { readExistingText: (filePath: string) => string },
      "readExistingText",
    ).mockReturnValue("");
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as {
        runCommand: (
          command: string,
          argumentsList: string[],
        ) => {
          standardError: string;
          standardOutput: string;
          status: null | number;
        };
      },
      "runCommand",
    ).mockReturnValue({
      standardError: "",
      standardOutput: "",
      status: 0,
    });
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as {
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
      },
      "runCommandChecked",
    ).mockReturnValue("");
    vi.spyOn(
      // type-coverage:ignore-next-line
      service as unknown as {
        writeTextFile: (filePath: string, value: string) => void;
      },
      "writeTextFile",
    ).mockReturnValue(undefined);

    service.publishToBranch("token", "owner/repo", archiveContext);

    expect(logger.log).toHaveBeenCalledWith(
      `📦 Published ${archiveContext.archiveName} to ${archiveContext.archiveBranch}`,
    );
  });
});
