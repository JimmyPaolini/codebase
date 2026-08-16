import { writeFileSync } from "node:fs";
import path from "node:path";

import { ConfigurationService } from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { ConformetryGeneratorsCommand } from "./conformetry-generators.command";

const fileContents = new Map<string, string>();
type ConformetryTestConfiguration = {
  aliases?: string[];
  description?: string;
  name: string;
}[];

let currentConformetryConfiguration: ConformetryTestConfiguration = [];
let loadConformetryConfigurationError: Error | undefined;

vi.mock("@conformetry/configuration", () => {
  return {
    ConfigurationService: class {
      async loadConformetryConfiguration(): Promise<ConformetryTestConfiguration> {
        await Promise.resolve();
        if (loadConformetryConfigurationError !== undefined) {
          throw loadConformetryConfigurationError;
        }
        return currentConformetryConfiguration;
      }
    },
  };
});

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

describe(ConformetryGeneratorsCommand, () => {
  let command: ConformetryGeneratorsCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const agentsFile = path.join(workspaceRoot, "AGENTS.md");

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConformetryGeneratorsCommand,
        ConfigurationService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(ConformetryGeneratorsCommand);
    logger = await module.resolve(LoggerService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
    currentConformetryConfiguration = [];
    loadConformetryConfigurationError = undefined;
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConformetryGeneratorsCommand,
        ConfigurationService,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "ConformetryGeneratorsCommand",
    );
  });

  it.each([
    {
      agentsContent: [
        "# Header",
        "<!-- conformetry-generators-table start -->",
        "| Generator | Alias | Description |",
        "| --------- | ----- | ----------- |",
        "| `alpha` | `a` | first |",
        "| `beta` | `b` | second |",
        "<!-- conformetry-generators-table end -->",
      ].join("\n"),
      expectedLogMessage:
        "📇 Verified the conformetry generators table",
      generators: [
        { aliases: ["a"], description: "first", name: "alpha" },
        { aliases: ["b"], description: "second", name: "beta" },
      ],
      modeArguments: ["check"],
      scenarioName:
        "passes check mode when generated table matches AGENTS markers",
    },
    {
      agentsContent: [
        "# Header",
        "<!-- conformetry-generators-table start -->",
        "| Generator | Alias | Description |",
        "| --------- | ----- | ----------- |",
        "| `alpha` |  | first |",
        "<!-- conformetry-generators-table end -->",
      ].join("\n"),
      expectedLogMessage:
        "📇 Verified the conformetry generators table",
      generators: [{ description: "first", name: "alpha" }],
      modeArguments: [],
      scenarioName: "defaults to check mode when no mode is provided",
    },
  ])(
    "$scenarioName",
    async ({
      agentsContent,
      expectedLogMessage,
      generators,
      modeArguments,
    }) => {
      currentConformetryConfiguration = generators;
      fileContents.set(agentsFile, agentsContent);

      await command.run(modeArguments);

      expect(logger.log).toHaveBeenCalledWith(expectedLogMessage, undefined, expect.any(Object));
      expect(writeFileSync).not.toHaveBeenCalled();
    },
  );

  it("writes generated table to AGENTS in write mode", async () => {
    currentConformetryConfiguration = [
      { aliases: ["a"], description: "first", name: "alpha" },
    ];
    fileContents.set(
      agentsFile,
      [
        "# Header",
        "<!-- conformetry-generators-table start -->",
        "stale",
        "<!-- conformetry-generators-table end -->",
      ].join("\n"),
    );

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
      agentsFile,
      expect.stringContaining("| `alpha` | `a` | first |"),
      "utf8",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "📇 Updated AGENTS.md",
     undefined, expect.any(Object));
  });

  it("exits on invalid mode", async () => {
    fileContents.set(
      agentsFile,
      [
        "# Header",
        "<!-- conformetry-generators-table start -->",
        "",
        "<!-- conformetry-generators-table end -->",
      ].join("\n"),
    );

    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith("🚦 Rejected an unusable mode", expect.any(String));
    expect(logger.error).toHaveBeenCalledWith("Expected 'check' or 'write'");
  });

  it.each([
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.error).toHaveBeenCalledWith(
          expect.stringContaining("Markers not found in AGENTS.md"),
        );
      },
      modeArguments: ["check"],
      scenarioName: "exits when AGENTS markers are missing",
      setup: (): void => {
        fileContents.set(agentsFile, "# Header without markers");
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.log).toHaveBeenCalledWith(
          "📇 Detected an out-of-sync conformetry generators table in AGENTS.md",
        );
        expect(loggerService.log).toHaveBeenCalledWith(
          "💡 Run 'pnpm exec nx run synchronization:start:conformetry-generators-write' to sync\n",
        );
      },
      modeArguments: ["check"],
      scenarioName:
        "reports drift when generated table differs from AGENTS content",
      setup: (): void => {
        currentConformetryConfiguration = [
          { aliases: ["a"], description: "first", name: "alpha" },
        ];
        fileContents.set(
          agentsFile,
          [
            "# Header",
            "<!-- conformetry-generators-table start -->",
            "| Generator | Alias | Description |",
            "| --------- | ----- | ----------- |",
            "| `stale` | `x` | mismatch |",
            "<!-- conformetry-generators-table end -->",
          ].join("\n"),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.error).toHaveBeenCalledWith(
          "💥 Failed synchronizing conformetry generators",
        );
      },
      modeArguments: ["check"],
      scenarioName: "handles non-Error throw values in run catch block",
      setup: (): void => {
        loadConformetryConfigurationError = new Error("[object Object]");
      },
    },
  ])("$scenarioName", async ({ assertLogs, modeArguments, setup }) => {
    setup();
    const processExitSpy = mockProcessExit();

    await expect(command.run(modeArguments)).rejects.toThrow("process.exit:1");

    assertLogs(logger);

    processExitSpy.mockRestore();
  });
});
