import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service";
import { ReadmeService } from "../readme/readme.service";

import { CodometerCommand } from "./codometer.command";
import { CodometerService } from "./codometer.service";

import type { CodeStatisticsResult } from "./codometer.types";

describe(CodometerCommand, () => {
  let command: CodometerCommand;
  let loggerService: LoggerService;
  let codometerService: CodometerService;
  let readmeService: ReadmeService;
  const statistics: CodeStatisticsResult = {
    folders: 0,
    javascript: {
      asyncFunctions: 0,
      classes: 0,
      commentLines: 0,
      comments: 0,
      constants: 0,
      exported: 0,
      externalPackages: 0,
      files: 0,
      functions: 0,
      imports: 0,
      methods: 0,
      syncFunctions: 0,
      testFiles: 0,
      todos: 0,
    },
    json: {
      arrays: 0,
      booleans: 0,
      files: 0,
      items: 0,
      lines: 0,
      maxDepth: 0,
      nulls: 0,
      numbers: 0,
      objects: 0,
      properties: 0,
      strings: 0,
      totalNodes: 0,
    },
    linesOfCode: 0,
    python: {
      classes: 0,
      commentLines: 0,
      comments: 0,
      constants: 0,
      decorators: 0,
      docstringLines: 0,
      docstrings: 0,
      files: 0,
      functions: 0,
      imports: 0,
      lines: 0,
      protocols: 0,
    },
    repoSizeMiB: 0,
    sourceFiles: 0,
    typescript: {
      decorators: 0,
      docComments: 0,
      enums: 0,
      files: 0,
      genericDeclarations: 0,
      interfaces: 0,
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CodometerService,
          useValue: createMock<CodometerService>(),
        },
        {
          provide: ReadmeService,
          useValue: createMock<ReadmeService>(),
        },
      ],
    }).compile();

    command = await module.resolve(CodometerCommand);
  });

  beforeEach(() => {
    loggerService = createMock<LoggerService>();
    codometerService = createMock<CodometerService>();
    readmeService = createMock<ReadmeService>();
    vi.mocked(codometerService.measure).mockReturnValue(statistics);
    vi.mocked(readmeService.syncReadme).mockReturnValue(true);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerCommand,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: CodometerService,
          useValue: createMock<CodometerService>(),
        },
        {
          provide: ReadmeService,
          useValue: createMock<ReadmeService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CodometerCommand");
  });

  it("parses check values from boolean and string inputs", () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );

    expect(localCommand.parseCheck(true)).toBe(true);
    expect(localCommand.parseCheck("true")).toBe(true);
    expect(localCommand.parseCheck("false")).toBe(false);
    // A valueless `--check` reaches the parser as undefined, and the parser
    // runs only when the flag is present. Reading that as false is what made
    // check mode rewrite the README and exit 0 instead of failing.
    expect(localCommand.parseCheck(undefined)).toBe(true);
  });

  it("defaults directory to process cwd", () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );

    expect(localCommand.parseDirectory(undefined)).toBe(process.cwd());
  });

  it("writes json statistics when readme path is omitted", async () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );
    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);
    await localCommand.run([], { check: false, directory: "/repo" });

    expect(codometerService.measure).toHaveBeenCalledWith("/repo");
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      `${JSON.stringify(statistics, null, 2)}\n`,
    );
    expect(readmeService.syncReadme).not.toHaveBeenCalled();

    stdoutWriteSpy.mockRestore();
  });

  it("syncs readme and flags outdated badges in check mode", async () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockReturnValue(undefined);
    vi.mocked(readmeService.syncReadme).mockReturnValue(false);
    process.exitCode = 0;

    await localCommand.run([], {
      check: true,
      directory: "/repo",
      readme: "README.md",
    });

    expect(readmeService.syncReadme).toHaveBeenCalledWith(
      "README.md",
      statistics,
      true,
    );
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "README badges are out of date",
    );
    expect(process.exitCode).toBe(1);

    consoleErrorSpy.mockRestore();
  });

  it("does not set exit code when readme is current in check mode", async () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );
    vi.mocked(readmeService.syncReadme).mockReturnValue(true);
    process.exitCode = 0;

    await localCommand.run([], {
      check: true,
      directory: "/repo",
      readme: "README.md",
    });

    expect(process.exitCode).toBe(0);
  });

  it("syncs readme in write mode when readme path is provided", async () => {
    const localCommand = new CodometerCommand(
      loggerService,
      codometerService,
      readmeService,
    );

    await localCommand.run([], {
      check: false,
      directory: "/repo",
      readme: "README.md",
    });

    expect(readmeService.syncReadme).toHaveBeenCalledWith(
      "README.md",
      statistics,
      false,
    );
  });

  it("creates fallback services when optional dependencies are omitted", () => {
    const fallbackCommand = new CodometerCommand(loggerService);

    expect(fallbackCommand).toBeDefined();
  });

  it("registers each CLI flag through the Option decorator", () => {
    const flags = ["parseCheck", "parseDirectory", "parseReadme"].map(
      (parser) =>
        Reflect.getMetadata(
          "CommandBuilder:Option:Meta",
          Reflect.get(CodometerCommand.prototype, parser) as object,
        ) as undefined | { flags: string },
    );

    expect(flags.map((option) => option?.flags)).toStrictEqual([
      "--check",
      "-d, --directory [directory]",
      "-r, --readme [readme]",
    ]);
  });
});
