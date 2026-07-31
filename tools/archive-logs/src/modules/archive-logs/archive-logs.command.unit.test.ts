import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { LoggerService } from "../logger/logger.service";
import { PublishLogsService } from "../publish-logs/publish-logs.service";

import { ArchiveLogsCommand } from "./archive-logs.command";
import { ArchiveLogsService } from "./archive-logs.service";

// 🧪 Helpers

const mockArchiveContext = {
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

// 🧪 Tests

describe(ArchiveLogsCommand, () => {
  let command: ArchiveLogsCommand;
  let logger: LoggerService;
  let archiveService: ArchiveLogsService;
  let publishLogsService: PublishLogsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArchiveLogsCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: ArchiveLogsService,
          useValue: createMock<ArchiveLogsService>(),
        },
        {
          provide: PublishLogsService,
          useValue: createMock<PublishLogsService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ArchiveLogsCommand);
    logger = await module.resolve(LoggerService);
    archiveService = await module.resolve(ArchiveLogsService);
    publishLogsService = await module.resolve(PublishLogsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    process.env["GH_TOKEN"] = "gh-token";
    process.env["GITHUB_ACTIONS"] = "false";

    vi.mocked(archiveService.buildContext).mockReturnValue(mockArchiveContext);
    vi.mocked(archiveService.archiveAlreadyExists).mockReturnValue(false);
    vi.mocked(archiveService.collectAndZip).mockReturnValue({
      includedRunIds: [1],
      skippedRunIds: [],
    });
  });

  afterEach(() => {
    delete process.env["GITHUB_REPOSITORY"];
    delete process.env["GH_TOKEN"];
    delete process.env["GITHUB_ACTIONS"];
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ArchiveLogsCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: ArchiveLogsService,
          useValue: createMock<ArchiveLogsService>(),
        },
        {
          provide: PublishLogsService,
          useValue: createMock<PublishLogsService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ArchiveLogsCommand");
  });

  describe("run", () => {
    it("archives runs for the given window", async () => {
      await command.run([], {
        end: "2025-01-08T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
      });

      expect(archiveService.collectAndZip).toHaveBeenCalledWith(
        "owner/repo",
        mockArchiveContext,
        {},
      );
    });

    it("passes workflow filters into the resolved archive options", async () => {
      await command.run([], {
        actor: "robot",
        branch: "main",
        end: "2025-01-08T00:00:00Z",
        event: "push",
        name: "nightly.yml",
        start: "2025-01-01T00:00:00Z",
        status: "completed",
      });

      expect(archiveService.collectAndZip).toHaveBeenCalledWith(
        "owner/repo",
        mockArchiveContext,
        {
          actor: "robot",
          branch: "main",
          event: "push",
          name: "nightly.yml",
          status: "completed",
        },
      );
    });

    it("logs success after archiving", async () => {
      await command.run([], {
        end: "2025-01-08T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
      });

      expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("✅"));
    });

    it("skips when archive already exists", async () => {
      vi.mocked(archiveService.archiveAlreadyExists).mockReturnValue(true);

      await command.run([], {
        end: "2025-01-08T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
      });

      expect(archiveService.collectAndZip).not.toHaveBeenCalled();
      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("already exists"),
      );
    });

    it("publishes when GITHUB_ACTIONS is true", async () => {
      process.env["GITHUB_ACTIONS"] = "true";

      await command.run([], {
        end: "2025-01-08T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
      });

      expect(publishLogsService.publishToBranch).toHaveBeenCalledWith(
        "gh-token",
        "owner/repo",
        mockArchiveContext,
      );
    });

    it("does not publish when GITHUB_ACTIONS is not true", async () => {
      await command.run([], {
        end: "2025-01-08T00:00:00Z",
        start: "2025-01-01T00:00:00Z",
      });

      expect(publishLogsService.publishToBranch).not.toHaveBeenCalled();
    });
  });

  describe("run - error handling", () => {
    it("exits with error when GITHUB_REPOSITORY is missing", async () => {
      delete process.env["GITHUB_REPOSITORY"];
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(
        command.run([], {
          end: "2025-01-08T00:00:00Z",
          start: "2025-01-01T00:00:00Z",
        }),
      ).rejects.toThrow("process.exit called");

      exitSpy.mockRestore();
    });

    it("exits with error when GH_TOKEN is missing", async () => {
      delete process.env["GH_TOKEN"];
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(
        command.run([], {
          end: "2025-01-08T00:00:00Z",
          start: "2025-01-01T00:00:00Z",
        }),
      ).rejects.toThrow("process.exit called");

      exitSpy.mockRestore();
    });

    it("exits with error when --start is missing", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(
        command.run([], { end: "2025-01-08T00:00:00Z" }),
      ).rejects.toThrow("process.exit called");

      exitSpy.mockRestore();
    });

    it("exits with error when --end is missing", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(
        command.run([], { start: "2025-01-01T00:00:00Z" }),
      ).rejects.toThrow("process.exit called");

      exitSpy.mockRestore();
    });

    it("exits with error when start is not before end", async () => {
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit called");
      });

      await expect(
        command.run([], {
          end: "2025-01-01T00:00:00Z",
          start: "2025-01-08T00:00:00Z",
        }),
      ).rejects.toThrow("process.exit called");

      exitSpy.mockRestore();
    });
  });

  describe("parseStart", () => {
    it("returns the raw string", () => {
      expect(command.parseStart("2025-01-01T00:00:00Z")).toBe(
        "2025-01-01T00:00:00Z",
      );
    });
  });

  describe("parseEnd", () => {
    it("returns the raw string", () => {
      expect(command.parseEnd("2025-01-08T00:00:00Z")).toBe(
        "2025-01-08T00:00:00Z",
      );
    });
  });

  describe("parseName", () => {
    it("returns the raw string", () => {
      expect(command.parseName("nightly.yml")).toBe("nightly.yml");
    });
  });

  describe("parseStatus", () => {
    it("returns the raw string", () => {
      expect(command.parseStatus("completed")).toBe("completed");
    });
  });

  describe("parseEvent", () => {
    it("returns the raw string", () => {
      expect(command.parseEvent("push")).toBe("push");
    });
  });

  describe("parseBranch", () => {
    it("returns the raw string", () => {
      expect(command.parseBranch("main")).toBe("main");
    });
  });

  describe("parseActor", () => {
    it("returns the raw string", () => {
      expect(command.parseActor("robot")).toBe("robot");
    });
  });
});
