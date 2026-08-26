import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { ExamplesCommand } from "./examples.command";
import { USAGE_MESSAGE } from "./examples.constants";
import { ExamplesService } from "./examples.service";

describe(ExamplesCommand, () => {
  let command: ExamplesCommand;
  let loggerMock: LoggerService;
  let examplesService: ExamplesService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExamplesCommand,
        { provide: ExamplesService, useValue: createMock<ExamplesService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(ExamplesCommand);
  });

  beforeEach(async () => {
    process.exitCode = undefined;
    loggerMock = createMock<LoggerService>();
    examplesService = createMock<ExamplesService>({
      run: vi
        .fn<ExamplesService["run"]>()
        .mockResolvedValue({ stalePaths: [], writtenCount: 21 }),
    });

    const module = await Test.createTestingModule({
      providers: [
        ExamplesCommand,
        { provide: ExamplesService, useValue: examplesService },
        { provide: LoggerService, useValue: loggerMock },
      ],
    }).compile();

    command = await module.resolve(ExamplesCommand);
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ExamplesCommand,
        { provide: ExamplesService, useValue: createMock<ExamplesService>() },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("ExamplesCommand");
  });

  describe("run", () => {
    it("rejects a command line naming neither mode", async () => {
      expect.hasAssertions();

      await command.run([], {});

      expect(process.exitCode).toBe(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "🕸️ Rejected the command line",
        undefined,
        {
          reason: "Either --check or --write is required",
          usage: USAGE_MESSAGE,
        },
      );
    });

    it("rejects a command line naming both modes", async () => {
      expect.hasAssertions();

      await command.run([], { check: true, write: true });

      expect(process.exitCode).toBe(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "🕸️ Rejected the command line",
        undefined,
        { reason: "Only one of --check or --write may be given" },
      );
    });

    it("reports every rendered example on a clean run", async () => {
      expect.hasAssertions();

      await command.run([], { write: true });

      expect(process.exitCode).toBeUndefined();
      expect(loggerMock.info).toHaveBeenCalledWith(
        "🕸️ Rendered every codependix example",
        undefined,
        { files: 21 },
      );
    });

    it("fails the run when a committed example has drifted", async () => {
      expect.hasAssertions();

      vi.mocked(examplesService.run).mockResolvedValue({
        stalePaths: ["01-graph-levels.md"],
        writtenCount: 21,
      });

      await command.run([], { check: true });

      expect(process.exitCode).toBe(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "🕸️ Found stale codependix examples",
        undefined,
        { paths: ["01-graph-levels.md"] },
      );
    });

    it("reports a run that raised rather than letting it escape", async () => {
      expect.hasAssertions();

      vi.mocked(examplesService.run).mockRejectedValue(
        new Error("no fixtures"),
      );

      await command.run([], { write: true });

      expect(process.exitCode).toBe(1);
      expect(loggerMock.error).toHaveBeenCalledWith(
        "💥 Failed rendering codependix examples",
        undefined,
        { reason: "Error: no fixtures" },
      );
    });
  });

  describe("describeError", () => {
    it("names the error class, and falls back to the raised value", () => {
      expect.hasAssertions();
      expect(command.describeError(new TypeError("no fixtures"))).toBe(
        "TypeError: no fixtures",
      );
      expect(command.describeError("no fixtures")).toBe("no fixtures");
    });
  });

  describe("option parsers", () => {
    it("defaults each flag to true when the flag is present with no value", () => {
      expect.hasAssertions();
      expect(command.parseCheck(undefined)).toBe(true);
      expect(command.parseWrite(undefined)).toBe(true);
    });

    it("defaults the output directory to the committed one", () => {
      expect.hasAssertions();
      expect(command.parseOutput(undefined)).toBe("output");
      expect(command.parseOutput("elsewhere")).toBe("elsewhere");
    });
  });
});
