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

import { DeleteLogsCommand } from "./delete-logs.command";
import { DeleteLogsService } from "./delete-logs.service";

describe(DeleteLogsCommand, () => {
  let command: DeleteLogsCommand;
  let logger: LoggerService;
  let deleteService: DeleteLogsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeleteLogsCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: DeleteLogsService,
          useValue: createMock<DeleteLogsService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DeleteLogsCommand);
    logger = await module.resolve(LoggerService);
    deleteService = await module.resolve(DeleteLogsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    process.env["GH_TOKEN"] = "gh-token";
  });

  afterEach(() => {
    delete process.env["GITHUB_REPOSITORY"];
    delete process.env["GH_TOKEN"];
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        DeleteLogsCommand,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: DeleteLogsService,
          useValue: createMock<DeleteLogsService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("DeleteLogsCommand");
  });

  it("deletes runs in the requested window when start and end are provided", async () => {
    await command.run([], {
      end: "2025-01-08T00:00:00Z",
      start: "2025-01-01T00:00:00Z",
    });

    expect(deleteService.deleteRunsInWindow).toHaveBeenCalledWith(
      "owner/repo",
      {
        deleteEnd: "2025-01-08T00:00:00Z",
        deleteStart: "2025-01-01T00:00:00Z",
      },
      {},
    );
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("🗑️"));
  });

  it("deletes all runs before end when start is not provided", async () => {
    await command.run([], {
      end: "2025-01-08T00:00:00Z",
    });

    expect(deleteService.deleteRunsBeforeEnd).toHaveBeenCalledWith(
      "owner/repo",
      "2025-01-08T00:00:00Z",
      {},
    );
    expect(deleteService.deleteRunsInWindow).not.toHaveBeenCalled();
  });

  it("passes workflow filters into the resolved delete options", async () => {
    await command.run([], {
      actor: "robot",
      branch: "main",
      end: "2025-01-08T00:00:00Z",
      event: "push",
      name: "nightly.yml",
      status: "completed",
    });

    expect(deleteService.deleteRunsBeforeEnd).toHaveBeenCalledWith(
      "owner/repo",
      "2025-01-08T00:00:00Z",
      {
        actor: "robot",
        branch: "main",
        event: "push",
        name: "nightly.yml",
        status: "completed",
      },
    );
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

  it("parses start option", () => {
    expect(command.parseStart("2025-01-01T00:00:00Z")).toBe(
      "2025-01-01T00:00:00Z",
    );
  });
});
