import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { SkillExclusionsCommand } from "./skill-exclusions.command";
import {
  BLOCK_END_MARKER,
  BLOCK_START_MARKER,
  SKILL_EXCLUSION_FILES,
} from "./skill-exclusions.constants";

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

describe(SkillExclusionsCommand, () => {
  let command: SkillExclusionsCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const lockfile = path.join(workspaceRoot, "skills-lock.json");

  /** Absolute path of one exclusion file, by its repository-relative path. */
  const resolve = (filePath: string): string =>
    path.join(workspaceRoot, filePath);

  /** Writes a lockfile declaring exactly these skills. */
  const setLockedSkills = (skillNames: string[]): void => {
    fileContents.set(
      lockfile,
      JSON.stringify({
        skills: Object.fromEntries(
          skillNames.map((name) => [name, { source: "owner/repo" }]),
        ),
      }),
    );
  };

  /** Writes every exclusion file with the block these skills imply. */
  const setSynchronizedFiles = (skillNames: string[]): void => {
    for (const file of SKILL_EXCLUSION_FILES) {
      fileContents.set(
        resolve(file.filePath),
        [
          "# hand-written content above",
          BLOCK_START_MARKER,
          ...skillNames.map((name) => file.renderEntry(name)),
          BLOCK_END_MARKER,
          "",
        ].join("\n"),
      );
    }
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SkillExclusionsCommand,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(SkillExclusionsCommand);
    logger = await module.resolve(LoggerService);
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
        SkillExclusionsCommand,
        SynchronizationService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("SkillExclusionsCommand");
  });

  describe("check", () => {
    it("passes when every file names every locked skill", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);

      await expect(command.synchronize("check")).resolves.toBe(true);
    });

    it("fails when a file is missing a locked skill", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    // A skill removed from the lockfile leaves entries behind, which would keep
    // excluding a directory nothing installs any more.
    it("fails when a file names a skill the lockfile dropped", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    it("names the stale files so the report is actionable", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);
      const stale = SKILL_EXCLUSION_FILES[0];

      expect(stale).toBeDefined();

      if (stale === undefined) return;
      fileContents.set(
        resolve(stale.filePath),
        [BLOCK_START_MARKER, BLOCK_END_MARKER, ""].join("\n"),
      );

      await command.synchronize("check");

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("out-of-sync"),
        undefined,
        expect.objectContaining({ files: [stale.filePath] }),
      );
    });

    // Ordering is what keeps the generated block reviewable, so a correct set in
    // the wrong order is still drift.
    it("fails when the entries are not sorted", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["tdd", "ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });

    it("reports failure when a file has no markers", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt"]);
      const first = SKILL_EXCLUSION_FILES[0];

      expect(first).toBeDefined();

      if (first === undefined) return;
      fileContents.set(resolve(first.filePath), "# no markers here\n");

      await expect(command.synchronize("check")).resolves.toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed synchronizing"),
        expect.any(String),
      );
    });

    it("reports failure when the lockfile is absent", async () => {
      setSynchronizedFiles(["ask-matt"]);

      await expect(command.synchronize("check")).resolves.toBe(false);
    });
  });

  describe("write", () => {
    it("brings every file in step with the lockfile", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles([]);

      await expect(command.synchronize("write")).resolves.toBe(true);
      await expect(command.synchronize("check")).resolves.toBe(true);
    });

    it("renders each file in its own syntax", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles([]);

      await command.synchronize("write");

      for (const file of SKILL_EXCLUSION_FILES) {
        expect(fileContents.get(resolve(file.filePath))).toContain(
          file.renderEntry("tdd"),
        );
      }
    });

    it("sorts the entries whatever order the lockfile lists them in", async () => {
      setLockedSkills(["tdd", "ask-matt", "grilling"]);
      setSynchronizedFiles([]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      const written = fileContents.get(resolve(file.filePath)) ?? "";

      expect(written.indexOf(file.renderEntry("ask-matt"))).toBeLessThan(
        written.indexOf(file.renderEntry("grilling")),
      );
      expect(written.indexOf(file.renderEntry("grilling"))).toBeLessThan(
        written.indexOf(file.renderEntry("tdd")),
      );
    });

    // Everything outside the markers is prose somebody wrote.
    it("leaves the hand-written content around the block untouched", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles(["ask-matt"]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      expect(fileContents.get(resolve(file.filePath))).toContain(
        "# hand-written content above",
      );
    });

    it("removes an entry the lockfile no longer declares", async () => {
      setLockedSkills(["ask-matt"]);
      setSynchronizedFiles(["ask-matt", "tdd"]);
      const file = SKILL_EXCLUSION_FILES[0];

      expect(file).toBeDefined();

      if (file === undefined) return;

      await command.synchronize("write");

      expect(fileContents.get(resolve(file.filePath))).not.toContain(
        file.renderEntry("tdd"),
      );
    });

    it("writes every file it reports", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles([]);

      await command.synchronize("write");

      expect(vi.mocked(writeFileSync)).toHaveBeenCalledTimes(
        SKILL_EXCLUSION_FILES.length,
      );
    });
  });

  describe("run", () => {
    it("exits non-zero when the lists are stale", async () => {
      setLockedSkills(["ask-matt", "tdd"]);
      setSynchronizedFiles(["ask-matt"]);

      await expectProcessExitOne(async () => command.run(["check"]));

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining("out-of-sync"),
        undefined,
        expect.any(Object),
      );
    });

    it("does not exit when the lists are in step", async () => {
      setLockedSkills(["tdd"]);
      setSynchronizedFiles(["tdd"]);
      const exit = mockProcessExit();

      await command.run(["check"]);

      expect(exit).not.toHaveBeenCalled();
    });
  });
});
