import { createMock } from "@golevelup/ts-vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CodometerCommand } from "./codometer.command";

import type { LoggerService } from "../logger/logger.service";
import type { WriteReadmeService } from "../write-readme/write-readme.service";
import type { CodometerService } from "./codometer.service";
import type { CodeStatisticsResult } from "./codometer.types";

describe(CodometerCommand, () => {
  let command: CodometerCommand;
  let loggerService: LoggerService;
  let codometerService: CodometerService;
  let writeReadmeService: WriteReadmeService;
  const statistics: CodeStatisticsResult = {
    asyncFunctions: 0,
    classes: 0,
    constants: 0,
    decorators: 0,
    enums: 0,
    exported: 0,
    externalPackages: 0,
    folders: 0,
    functions: 0,
    genericDeclarations: 0,
    imports: 0,
    interfaces: 0,
    jsFiles: 0,
    jsonArrays: 0,
    jsonBooleans: 0,
    jsonFiles: 0,
    jsonItems: 0,
    jsonLines: 0,
    jsonMaxDepth: 0,
    jsonNulls: 0,
    jsonNumbers: 0,
    jsonObjects: 0,
    jsonProperties: 0,
    jsonStrings: 0,
    jsonTotalNodes: 0,
    linesOfCode: 0,
    methods: 0,
    pythonClasses: 0,
    pythonConstants: 0,
    pythonDecorators: 0,
    pythonFiles: 0,
    pythonFunctions: 0,
    pythonImports: 0,
    pythonLines: 0,
    pythonProtocols: 0,
    repoSizeMiB: "0",
    sourceFiles: 0,
    syncFunctions: 0,
    testFiles: 0,
    todos: 0,
    tsFiles: 0,
  };

  beforeEach(() => {
    loggerService = createMock<LoggerService>();
    codometerService = createMock<CodometerService>();
    writeReadmeService = createMock<WriteReadmeService>();
    vi.mocked(codometerService.measure).mockReturnValue(statistics);
    vi.mocked(writeReadmeService.syncReadme).mockReturnValue(true);
    command = new CodometerCommand(
      loggerService,
      codometerService,
      writeReadmeService,
    );
  });

  it("parses check values from boolean and string inputs", () => {
    expect(command.parseCheck(true)).toBe(true);
    expect(command.parseCheck("true")).toBe(true);
    expect(command.parseCheck("false")).toBe(false);
    expect(command.parseCheck(undefined)).toBe(false);
  });

  it("defaults directory to process cwd", () => {
    expect(command.parseDirectory(undefined)).toBe(process.cwd());
  });

  it("writes json statistics when readme path is omitted", async () => {
    const stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockReturnValue(true);
    await command.run([], { check: false, directory: "/repo" });

    expect(codometerService.measure).toHaveBeenCalledWith("/repo");
    expect(stdoutWriteSpy).toHaveBeenCalledWith(
      `${JSON.stringify(statistics, null, 2)}\n`,
    );
    expect(writeReadmeService.syncReadme).not.toHaveBeenCalled();

    stdoutWriteSpy.mockRestore();
  });

  it("syncs readme and flags outdated badges in check mode", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockReturnValue(undefined);
    vi.mocked(writeReadmeService.syncReadme).mockReturnValue(false);
    process.exitCode = 0;

    await command.run([], {
      check: true,
      directory: "/repo",
      readme: "README.md",
    });

    expect(writeReadmeService.syncReadme).toHaveBeenCalledWith(
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
    vi.mocked(writeReadmeService.syncReadme).mockReturnValue(true);
    process.exitCode = 0;

    await command.run([], {
      check: true,
      directory: "/repo",
      readme: "README.md",
    });

    expect(process.exitCode).toBe(0);
  });

  it("syncs readme in write mode when readme path is provided", async () => {
    await command.run([], {
      check: false,
      directory: "/repo",
      readme: "README.md",
    });

    expect(writeReadmeService.syncReadme).toHaveBeenCalledWith(
      "README.md",
      statistics,
      false,
    );
  });

  it("creates fallback services when optional dependencies are omitted", () => {
    const fallbackCommand = new CodometerCommand(loggerService);

    expect(fallbackCommand).toBeDefined();
  });

  it("ignores option metadata registration for unknown parser names", () => {
    const registerOptionMetadata = Reflect.get(
      command,
      "registerOptionMetadata",
    ) as (
      propertyKey: string,
      options: { description: string; flags: string },
    ) => void;
    registerOptionMetadata("missingParser", {
      description: "Missing parser",
      flags: "--missing",
    });

    expect(command).toBeDefined();
  });

  it("ignores option metadata registration for non-function descriptors", () => {
    Object.defineProperty(CodometerCommand.prototype, "nonFunctionParser", {
      configurable: true,
      value: "not-a-function",
    });

    const registerOptionMetadata = Reflect.get(
      command,
      "registerOptionMetadata",
    ) as (
      propertyKey: string,
      options: { description: string; flags: string },
    ) => void;

    registerOptionMetadata("nonFunctionParser", {
      description: "Non-function parser",
      flags: "--non-function",
    });

    Reflect.deleteProperty(CodometerCommand.prototype, "nonFunctionParser");

    expect(command).toBeDefined();
  });
});
