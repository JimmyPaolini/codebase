import { writeFileSync } from "node:fs";
import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { expectProcessExitOne, mockProcessExit } from "../../../testing/mocks";
import { LoggerService } from "../logger/logger.service";
import { SynchronizationService } from "../synchronization/synchronization.service";

import { DevcontainerConfigurationCommand } from "./devcontainer-configuration.command";

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

describe(DevcontainerConfigurationCommand, () => {
  let command: DevcontainerConfigurationCommand;
  let logger: LoggerService;

  const workspaceRoot = process.cwd();
  const localConfigFile = path.join(
    workspaceRoot,
    ".devcontainer/local/devcontainer.json",
  );
  const cloudConfigFile = path.join(
    workspaceRoot,
    ".devcontainer/cloud/devcontainer.json",
  );

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DevcontainerConfigurationCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    command = await module.resolve(DevcontainerConfigurationCommand);
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
        DevcontainerConfigurationCommand,
        SynchronizationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "DevcontainerConfigurationCommand",
    );
  });

  it.each([
    {
      cloudConfig: {
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/node:1": {},
        },
        mounts: ["source=/cache,target=/cache,type=volume"],
        remoteEnv: {
          APP_ENVIRONMENT: "local",
        },
      },
      localConfig: {
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/node:1": {},
        },
        remoteEnv: {
          APP_ENVIRONMENT: "local",
        },
      },
      modeArguments: ["check"],
      scenarioName:
        "passes check mode when cloud config is already synchronized",
    },
    {
      cloudConfig: {
        $schema: "schema",
        features: {},
        mounts: ["different"],
      },
      localConfig: {
        $schema: "schema",
        features: {},
      },
      modeArguments: [],
      scenarioName:
        "ignores cloud-only key differences in check mode by defaulting to check",
    },
  ])("$scenarioName", async ({ cloudConfig, localConfig, modeArguments }) => {
    fileContents.set(localConfigFile, JSON.stringify(localConfig));
    fileContents.set(cloudConfigFile, JSON.stringify(cloudConfig));

    await command.run(modeArguments);

    expect(logger.log).toHaveBeenCalledWith(
      "✅ Cloud devcontainer config is in sync with local config",
    );
    expect(writeFileSync).not.toHaveBeenCalled();
  });

  it("writes synchronized cloud config in write mode", async () => {
    const localConfig = {
      $schema: "schema",
      customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
      features: {
        "ghcr.io/devcontainers/features/common-utils:2": {},
      },
      remoteEnv: {
        APP_ENVIRONMENT: "local",
        CODEBASE_ENVIRONMENT: "local",
      },
    };
    const cloudConfig = {
      $schema: "old-schema",
      features: {
        "ghcr.io/devcontainers/features/docker-in-docker:2": {},
      },
      mounts: ["source=/cache,target=/cache,type=volume"],
      remoteEnv: {
        APP_ENVIRONMENT: "cloud",
        CODEBASE_ENVIRONMENT: "cloud",
      },
    };

    fileContents.set(localConfigFile, JSON.stringify(localConfig));
    fileContents.set(cloudConfigFile, JSON.stringify(cloudConfig));

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledTimes(1);
    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining(
        '"ghcr.io/devcontainers/features/docker-in-docker:2"',
      ),
      "utf8",
    );
    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining('"CODEBASE_ENVIRONMENT": "cloud"'),
      "utf8",
    );
    expect(logger.log).toHaveBeenCalledWith(
      "✅ Cloud devcontainer config updated from local config",
    );
  });

  it("skips docker features from local config during write sync", async () => {
    fileContents.set(
      localConfigFile,
      JSON.stringify({
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/docker-in-docker:2": {
            source: "local",
          },
        },
      }),
    );
    fileContents.set(
      cloudConfigFile,
      JSON.stringify({
        $schema: "schema",
        features: {
          "ghcr.io/devcontainers/features/docker-in-docker:2": {
            source: "cloud",
          },
        },
      }),
    );

    await command.run(["write"]);

    expect(writeFileSync).toHaveBeenCalledWith(
      cloudConfigFile,
      expect.stringContaining('"source": "cloud"'),
      "utf8",
    );
  });

  it.each([
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.log).toHaveBeenCalledWith(
          expect.stringContaining(
            "has common fields out of sync with local config",
          ),
        );
        expect(loggerService.log).toHaveBeenCalledWith(
          "  Run: nx run synchronization:start:devcontainer-configuration-write",
        );
      },
      scenarioName: "reports drift and exits in check mode when configs differ",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.log).not.toHaveBeenCalledWith(
          expect.stringContaining("mounts"),
        );
      },
      scenarioName:
        "skips reporting cloud-only keys when other fields are out of sync",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            mounts: ["source=/cache,target=/cache,type=volume"],
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
    {
      assertLogs: (loggerService: LoggerService): void => {
        expect(loggerService.log).not.toHaveBeenCalledWith(
          expect.stringContaining("Field 'customizations' differs"),
        );
        expect(loggerService.log).toHaveBeenCalledWith(
          expect.stringContaining("Field '$schema' differs"),
        );
      },
      scenarioName:
        "does not report equal non-cloud fields while reporting actual drift",
      setup: (): void => {
        fileContents.set(
          localConfigFile,
          JSON.stringify({
            $schema: "schema",
            customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
            remoteEnv: { APP_ENVIRONMENT: "local" },
          }),
        );
        fileContents.set(
          cloudConfigFile,
          JSON.stringify({
            $schema: "different-schema",
            customizations: { vscode: { settings: { "editor.tabSize": 2 } } },
            remoteEnv: { APP_ENVIRONMENT: "cloud" },
          }),
        );
      },
    },
  ])("$scenarioName", async ({ assertLogs, setup }) => {
    setup();
    const processExitSpy = mockProcessExit();

    await expect(command.run(["check"])).rejects.toThrow("process.exit:1");

    assertLogs(logger);

    processExitSpy.mockRestore();
  });

  it("exits on invalid mode", async () => {
    fileContents.set(localConfigFile, JSON.stringify({}));
    fileContents.set(cloudConfigFile, JSON.stringify({}));

    await expectProcessExitOne(async () => command.run(["invalid-mode"]));

    expect(logger.error).toHaveBeenCalledWith("❌ Invalid mode: invalid-mode");
    expect(logger.error).toHaveBeenCalledWith(
      "💡 Usage: nx run synchronization:start:devcontainer-configuration-check (or synchronization:start:devcontainer-configuration-write)",
    );
  });
});
