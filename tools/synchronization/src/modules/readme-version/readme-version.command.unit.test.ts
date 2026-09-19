import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { ReadmeVersionCommand } from "./readme-version.command";
import {
  PACKAGE_JSON_PATH,
  ROOT_README_PATH,
} from "./readme-version.constants";
import { ReadmeVersionService } from "./readme-version.service";

const fileContents = new Map<string, string>();

vi.mock("node:fs", () => {
  return {
    readFileSync: vi.fn<(filePath: string) => string>((filePath: string) => {
      const value = fileContents.get(filePath);
      if (value === undefined) {
        throw new Error(`File not found: ${filePath}`);
      }
      return value;
    }),
    writeFileSync: vi.fn<(filePath: string, content: string) => void>(
      (filePath: string, content: string) => {
        fileContents.set(filePath, content);
      },
    ),
  };
});

describe(ReadmeVersionCommand, () => {
  let command: ReadmeVersionCommand;
  let logger: LoggerService;
  let readmeVersionService: ReadmeVersionService;

  const workspaceRoot = process.cwd();
  const packageJsonPath = path.join(workspaceRoot, PACKAGE_JSON_PATH);
  const readmePath = path.join(workspaceRoot, ROOT_README_PATH);

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReadmeVersionCommand,
        ReadmeVersionService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ReadmeVersionCommand);
    logger = await module.resolve(LoggerService);
    readmeVersionService = await module.resolve(ReadmeVersionService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReadmeVersionCommand,
        ReadmeVersionService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ReadmeVersionCommand");
  });

  it("runs command in check mode when valid", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.6\n\nContent here...");

    await command.run(["check"]);

    expect(logger.info).toHaveBeenCalledWith(
      "📄 Verified the root README version is in sync",
    );
  });

  it("exits with 1 in run when check mode fails", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.5\n\nContent here...");

    await expect(
      expectProcessExitOne(async () => {
        await command.run(["check"]);
      }),
    ).resolves.toBeUndefined();
  });

  it("passes check mode when README title is in sync with package.json", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.6\n\nContent here...");

    const result = await command.synchronize("check");

    expect(result).toBe(true);
    expect(logger.info).toHaveBeenCalledWith(
      "📄 Verified the root README version is in sync",
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("fails check mode when README title is out of sync with package.json", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.5\n\nContent here...");

    const result = await command.synchronize("check");

    expect(result).toBe(false);
    expect(logger.info).toHaveBeenCalledWith(
      "📄 Detected an out-of-sync root README version",
      undefined,
      expect.objectContaining({
        expectedTitle: "# Codebase v2.10.6",
        version: "2.10.6",
      }),
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("updates README title in write mode when out of sync", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.5\n\nContent here...");

    const result = await command.synchronize("write");

    expect(result).toBe(true);
    expect(writeFileSync).toHaveBeenCalledWith(
      readmePath,
      "# Codebase v2.10.6\n\nContent here...",
      "utf8",
    );
    expect(logger.info).toHaveBeenCalledWith(
      "📄 Synced the root README version",
      undefined,
      expect.objectContaining({
        version: "2.10.6",
      }),
    );
  });

  it("does not write in write mode when already in sync", async () => {
    fileContents.set(packageJsonPath, JSON.stringify({ version: "2.10.6" }));
    fileContents.set(readmePath, "# Codebase v2.10.6\n\nContent here...");

    const result = await command.synchronize("write");

    expect(result).toBe(true);
    expect(writeFileSync).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      "📄 Verified the root README version was already in sync",
    );
  });

  it("handles error during synchronize and returns false when error is an Error", async () => {
    const result = await command.synchronize("check");

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing the root README version",
      expect.stringContaining("File not found"),
    );
  });

  it("handles non-Error throw during synchronize", async () => {
    vi.spyOn(readmeVersionService, "readPackageVersion").mockImplementationOnce(
      () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw "string-error";
      },
    );

    const result = await command.synchronize("check");

    expect(result).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "💥 Failed synchronizing the root README version",
      "string-error",
    );
  });
});
