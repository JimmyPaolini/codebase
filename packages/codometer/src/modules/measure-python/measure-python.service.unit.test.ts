import { Logger } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { MeasurePythonService } from "./measure-python.service";

const { execSyncMock } = vi.hoisted(() => ({
  execSyncMock: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  execSync: execSyncMock,
}));

describe(MeasurePythonService, () => {
  let service: MeasurePythonService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [MeasurePythonService],
    }).compile();

    service = await module.resolve(MeasurePythonService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns parsed python metrics when script execution succeeds", () => {
    execSyncMock.mockReturnValue(
      JSON.stringify({
        classes: 1,
        commentLines: 3,
        comments: 2,
        constants: 4,
        decorators: 5,
        docstringLines: 7,
        docstrings: 6,
        files: 8,
        functions: 9,
        imports: 10,
        lines: 11,
        protocols: 12,
      }),
    );

    const result = service.analyze("/repo");

    expect(execSyncMock).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("uv run python"),
      {
        cwd: "/repo",
        encoding: "utf8",
      },
    );
    expect(result).toStrictEqual({
      classes: 1,
      commentLines: 3,
      comments: 2,
      constants: 4,
      decorators: 5,
      docstringLines: 7,
      docstrings: 6,
      files: 8,
      functions: 9,
      imports: 10,
      lines: 11,
      protocols: 12,
    });
  });

  it("returns empty metrics and logs a warning when execution fails", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    execSyncMock.mockImplementation(() => {
      throw new Error("failed to execute");
    });

    const result = service.analyze("/repo");

    expect(result).toStrictEqual({
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
    });
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🐍 Skipped Python analysis",
    );

    loggerWarnSpy.mockRestore();
  });

  it("handles non-Error exceptions gracefully", () => {
    const loggerWarnSpy = vi
      .spyOn(Logger.prototype, "warn")
      .mockReturnValue(undefined);
    execSyncMock.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "string error";
    });

    const result = service.analyze("/repo");

    expect(result).toStrictEqual({
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
    });
    expect(loggerWarnSpy).toHaveBeenCalledWith(
      "🐍 Skipped Python analysis",
    );

    loggerWarnSpy.mockRestore();
  });
});
