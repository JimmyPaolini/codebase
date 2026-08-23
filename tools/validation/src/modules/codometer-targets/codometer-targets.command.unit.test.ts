import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { mockProcessExit } from "../../../testing/mocks";

import { CodometerTargetsCommand } from "./codometer-targets.command";
import { CodometerTargetsService } from "./codometer-targets.service";

describe(CodometerTargetsCommand, () => {
  let command: CodometerTargetsCommand;
  let codometerTargetsService: CodometerTargetsService;
  let reportLines: string[];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerTargetsCommand,
        {
          provide: CodometerTargetsService,
          useValue: createMock<CodometerTargetsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    command = await module.resolve(CodometerTargetsCommand);
    codometerTargetsService = await module.resolve(CodometerTargetsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    reportLines = [];
    vi.spyOn(console, "info").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.spyOn(console, "error").mockImplementation((line: unknown): void => {
      reportLines.push(String(line));
    });
    vi.mocked(codometerTargetsService.resolveWorkspaceProjects).mockReturnValue(
      [
        {
          directory: "packages/logger",
          packageManifestPath: "packages/logger/package.json",
          projectManifestPath: "packages/logger/project.json",
        },
      ],
    );
    vi.mocked(codometerTargetsService.readProjectManifest).mockReturnValue({});
    vi.mocked(codometerTargetsService.readPackageManifest).mockReturnValue(
      undefined,
    );
    vi.mocked(codometerTargetsService.declaresCodometerTarget).mockReturnValue(
      true,
    );
    vi.mocked(codometerTargetsService.declaresSizeLimit).mockReturnValue(true);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    expect.hasAssertions();

    const module = await Test.createTestingModule({
      providers: [
        CodometerTargetsCommand,
        {
          provide: CodometerTargetsService,
          useValue: createMock<CodometerTargetsService>(),
        },
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();
    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("CodometerTargetsCommand");
  });

  it("reports how many projects declare the target", async () => {
    expect.hasAssertions();

    await command.run();

    expect(reportLines).toStrictEqual([
      "Every one of 1 workspace projects declares a codometer target.",
    ]);
  });

  it("reports every ungated project without failing", async () => {
    expect.hasAssertions();

    vi.mocked(codometerTargetsService.declaresSizeLimit).mockReturnValue(false);

    await command.run();

    expect(reportLines).toStrictEqual([
      "Measured but ungated, no sizeLimit declared:",
      "- packages/logger",
      "Every one of 1 workspace projects declares a codometer target.",
    ]);
  });

  it("names every project missing the target and exits non-zero", async () => {
    expect.hasAssertions();

    vi.mocked(codometerTargetsService.declaresCodometerTarget).mockReturnValue(
      false,
    );

    const processExitSpy = mockProcessExit();

    await expect(command.run()).rejects.toThrow("process.exit:1");

    processExitSpy.mockRestore();

    expect(reportLines).toStrictEqual([
      "Projects missing a codometer target:",
      "- packages/logger",
    ]);
  });
});
