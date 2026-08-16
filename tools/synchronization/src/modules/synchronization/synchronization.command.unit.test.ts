import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { AgentSkillsCommand } from "../agent-skills/agent-skills.command";
import { ConformetryGeneratorsCommand } from "../conformetry-generators/conformetry-generators.command";
import { ConventionalConfigCommand } from "../conventional-config/conventional-config.command";
import { DevcontainerConfigurationCommand } from "../devcontainer-configuration/devcontainer-configuration.command";
import { PullRequestTemplateCommand } from "../pull-request-template/pull-request-template.command";

import { SynchronizationCommand } from "./synchronization.command";
import { SynchronizationService } from "./synchronization.service";

import type { SynchronizableCommand } from "./synchronization.types";

describe(SynchronizationCommand, () => {
  let agentSkills: AgentSkillsCommand;
  let command: SynchronizationCommand;
  let conformetryGenerators: ConformetryGeneratorsCommand;
  let conventionalConfig: ConventionalConfigCommand;
  let devcontainerConfiguration: DevcontainerConfigurationCommand;
  let logger: LoggerService;
  let pullRequestTemplate: PullRequestTemplateCommand;

  /** The delegates in the order the aggregate reports them. */
  function getDelegates(): SynchronizableCommand[] {
    return [
      agentSkills,
      conformetryGenerators,
      conventionalConfig,
      devcontainerConfiguration,
      pullRequestTemplate,
    ];
  }

  /** Makes every delegate report the same outcome. */
  function stubAllDelegates(succeeded: boolean): void {
    for (const delegate of getDelegates()) {
      vi.mocked(delegate.synchronize).mockResolvedValue(succeeded);
    }
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SynchronizationCommand,
        SynchronizationService,
        {
          provide: AgentSkillsCommand,
          useValue: createMock<AgentSkillsCommand>({
            synchronizationLabel: "agent-skills",
          }),
        },
        {
          provide: ConformetryGeneratorsCommand,
          useValue: createMock<ConformetryGeneratorsCommand>({
            synchronizationLabel: "conformetry-generators",
          }),
        },
        {
          provide: ConventionalConfigCommand,
          useValue: createMock<ConventionalConfigCommand>({
            synchronizationLabel: "conventional-config",
          }),
        },
        {
          provide: DevcontainerConfigurationCommand,
          useValue: createMock<DevcontainerConfigurationCommand>({
            synchronizationLabel: "devcontainer-configuration",
          }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PullRequestTemplateCommand,
          useValue: createMock<PullRequestTemplateCommand>({
            synchronizationLabel: "pull-request-template",
          }),
        },
      ],
    }).compile();

    agentSkills = await module.resolve(AgentSkillsCommand);
    command = await module.resolve(SynchronizationCommand);
    conformetryGenerators = await module.resolve(ConformetryGeneratorsCommand);
    conventionalConfig = await module.resolve(ConventionalConfigCommand);
    devcontainerConfiguration = await module.resolve(
      DevcontainerConfigurationCommand,
    );
    logger = await module.resolve(LoggerService);
    pullRequestTemplate = await module.resolve(PullRequestTemplateCommand);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        SynchronizationCommand,
        SynchronizationService,
        {
          provide: AgentSkillsCommand,
          useValue: createMock<AgentSkillsCommand>(),
        },
        {
          provide: ConformetryGeneratorsCommand,
          useValue: createMock<ConformetryGeneratorsCommand>(),
        },
        {
          provide: ConventionalConfigCommand,
          useValue: createMock<ConventionalConfigCommand>(),
        },
        {
          provide: DevcontainerConfigurationCommand,
          useValue: createMock<DevcontainerConfigurationCommand>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PullRequestTemplateCommand,
          useValue: createMock<PullRequestTemplateCommand>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith("SynchronizationCommand");
  });

  it("runs every command in check mode and reports success", async () => {
    stubAllDelegates(true);

    await expect(command.synchronize("check")).resolves.toBe(true);

    for (const delegate of getDelegates()) {
      expect(delegate.synchronize).toHaveBeenCalledWith("check");
    }

    expect(logger.log).toHaveBeenCalledWith(
      "🔗 Verified every synchronization",
      undefined,
      expect.any(Object),
    );
  });

  it("forwards write mode to every command", async () => {
    stubAllDelegates(true);

    await expect(command.synchronize("write")).resolves.toBe(true);

    for (const delegate of getDelegates()) {
      expect(delegate.synchronize).toHaveBeenCalledWith("write");
    }
  });

  // The whole point of the aggregate: one run surfaces all drift, so a failing
  // command must not stop the ones after it.
  it("runs the remaining commands after one fails", async () => {
    stubAllDelegates(true);
    vi.mocked(agentSkills.synchronize).mockResolvedValue(false);

    await expect(command.synchronize("check")).resolves.toBe(false);

    for (const delegate of getDelegates()) {
      expect(delegate.synchronize).toHaveBeenCalledTimes(1);
    }

    expect(logger.log).toHaveBeenCalledWith(
      "📋 Summarized the synchronization run",
      undefined,
      expect.any(Object),
    );
    expect(logger.log).toHaveBeenCalledWith(
      "🔗 Detected out-of-sync synchronizations",
      undefined,
      expect.any(Object),
    );
  });

  it("defaults to check mode when no mode is passed", async () => {
    stubAllDelegates(true);

    await command.run([]);

    expect(agentSkills.synchronize).toHaveBeenCalledWith("check");
  });

  it("exits with code 1 when any command reports drift", async () => {
    stubAllDelegates(true);
    vi.mocked(pullRequestTemplate.synchronize).mockResolvedValue(false);

    await expectProcessExitOne(async () => {
      await command.run(["check"]);
    });

    expect(logger.log).toHaveBeenCalledWith(
      "🔗 Detected out-of-sync synchronizations",
      undefined,
      expect.any(Object),
    );
  });

  it("exits with code 1 on an unknown mode", async () => {
    stubAllDelegates(true);

    await expectProcessExitOne(async () => {
      await command.run(["sideways"]);
    });

    expect(agentSkills.synchronize).not.toHaveBeenCalled();
  });
});
