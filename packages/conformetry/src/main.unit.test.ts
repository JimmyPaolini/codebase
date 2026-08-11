import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { beforeEach, describe, expect, it, vi } from "vitest";

interface CommandFactoryRunOptions {
  errorHandler: (error: Error) => void;
  serviceErrorHandler: (error: Error) => void;
}

const mockLoggerError = vi.fn<(message: unknown) => void>();
const mockLoggerSetContext = vi.fn<(context: string) => void>();
const mockCommandFactoryRun = vi.fn<
  (_module: unknown, _options: CommandFactoryRunOptions) => Promise<void>
>(async () => {});

vi.mock("@nestjs/common", () => {
  class MockConsoleLogger {
    error(message: unknown): void {
      mockLoggerError(message);
    }

    setContext(context: string): void {
      mockLoggerSetContext(context);
    }
  }

  return {
    ConsoleLogger: MockConsoleLogger,
    Injectable: (options?: unknown) => {
      return (target: unknown): unknown => target;
    },
    Scope: {
      TRANSIENT: "TRANSIENT",
    },
  };
});

vi.mock("nest-commander", () => {
  return {
    CommandFactory: {
      run: mockCommandFactoryRun,
    },
  };
});

vi.mock("./main.module.js", () => {
  function MockMainModule(): void {}

  return {
    MainModule: MockMainModule,
  };
});

function getRunOptions(): CommandFactoryRunOptions {
  const firstCall = mockCommandFactoryRun.mock.calls[0];

  if (firstCall === undefined) {
    throw new Error("Expected CommandFactory.run to be called once.");
  }

  const options = firstCall[1] as CommandFactoryRunOptions | undefined;

  if (!options) {
    throw new Error("Expected CommandFactory.run options to be defined.");
  }

  return options;
}

async function importMainModule(): Promise<void> {
  await import("./main");
}

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLoggerError.mockClear();
    mockLoggerSetContext.mockClear();
    mockCommandFactoryRun.mockClear();
    process.exitCode = 0;
    process.argv = ["node", "conformetry"];
  });

  it("bootstraps the command factory without rewriting argv", async () => {
    process.argv = [
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ];

    await importMainModule();

    expect(mockCommandFactoryRun).toHaveBeenCalledTimes(1);
    expect(mockLoggerSetContext).toHaveBeenCalledWith("CommandFactory");
    expect(process.argv).toStrictEqual([
      "node",
      "conformetry",
      "generate",
      "--name",
      "react-component",
      "--project",
      "lexico-components",
    ]);
    expect(process.env["CONFORMETRY_GENERATOR_OPTIONS"]).toBeUndefined();
  });

  it("wires command error handler to mark process as failed", async () => {
    const { LoggerService } = await import("./modules/logger/logger.service");
    const errorSpy = vi.spyOn(LoggerService.prototype, "error");

    await importMainModule();

    const runOptions = getRunOptions();
    const failure = new Error("command failure");

    runOptions.errorHandler(failure);

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(failure);
    errorSpy.mockRestore();
  });

  it("wires service error handler to mark process as failed", async () => {
    const { LoggerService } = await import("./modules/logger/logger.service");
    const errorSpy = vi.spyOn(LoggerService.prototype, "error");

    await importMainModule();

    const runOptions = getRunOptions();
    const failure = new Error("service failure");

    runOptions.serviceErrorHandler(failure);

    expect(process.exitCode).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(failure);
    errorSpy.mockRestore();
  });

  describe("wrapper target wiring", () => {
    const currentFilePath = fileURLToPath(import.meta.url);
    const currentDirectoryPath = path.dirname(currentFilePath);
    const workspaceRootPath = path.resolve(currentDirectoryPath, "../../../");

    it("disables cache for wrapper targets to avoid stale success results", async () => {
      expect.hasAssertions();

      const codebaseProjectConfiguration = JSON.parse(
        await readFile(path.join(workspaceRootPath, "project.json"), "utf8"),
      ) as {
        targets: {
          "conformetry-generate": {
            cache?: boolean;
          };
          "conformetry-validate": {
            cache?: boolean;
          };
        };
      };
      const conformetryProjectConfiguration = JSON.parse(
        await readFile(
          path.join(workspaceRootPath, "packages/conformetry/project.json"),
          "utf8",
        ),
      ) as {
        targets: {
          start: {
            cache?: boolean;
          };
        };
      };

      expect(
        codebaseProjectConfiguration.targets["conformetry-generate"].cache,
      ).toBe(false);
      expect(
        codebaseProjectConfiguration.targets["conformetry-validate"].cache,
      ).toBe(false);
      expect(conformetryProjectConfiguration.targets.start.cache).toBe(false);
    });

    it("keeps wrapper commands strict without masking failures", async () => {
      expect.hasAssertions();

      const codebaseProjectConfiguration = JSON.parse(
        await readFile(path.join(workspaceRootPath, "project.json"), "utf8"),
      ) as {
        targets: {
          "conformetry-generate": {
            options: {
              command: string;
            };
          };
          "conformetry-validate": {
            options: {
              command: string;
            };
          };
        };
      };

      expect(
        codebaseProjectConfiguration.targets["conformetry-generate"].options
          .command,
      ).not.toContain("|| true");
      expect(
        codebaseProjectConfiguration.targets["conformetry-validate"].options
          .command,
      ).not.toContain("|| true");
    });
  });
});
