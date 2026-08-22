import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { expectProcessExitOne } from "../../../testing/mocks";
import { ConformetryGeneratorsCommand } from "../conformetry-generators/conformetry-generators.command";
import { ConventionalConfigCommand } from "../conventional-config/conventional-config.command";
import { DevcontainerConfigurationCommand } from "../devcontainer-configuration/devcontainer-configuration.command";
import { NestjsModuleGraphsCommand } from "../nestjs-module-graphs/nestjs-module-graphs.command";
import { NxProjectGraphsCommand } from "../nx-project-graphs/nx-project-graphs.command";
import { PullRequestTemplateCommand } from "../pull-request-template/pull-request-template.command";
import { SkillExclusionsCommand } from "../skill-exclusions/skill-exclusions.command";

import { SynchronizationKindsService } from "./synchronization-kinds.service";
import { SynchronizationCommand } from "./synchronization.command";
import {
  SYNCHRONIZATION_KIND_DERIVATION,
  SYNCHRONIZATION_KIND_REPORT,
} from "./synchronization.constants";
import { SynchronizationService } from "./synchronization.service";

import type { SynchronizableCommand } from "./synchronization.types";

describe(SynchronizationCommand, () => {
  let command: SynchronizationCommand;
  let conformetryGenerators: ConformetryGeneratorsCommand;
  let conventionalConfig: ConventionalConfigCommand;
  let devcontainerConfiguration: DevcontainerConfigurationCommand;
  let logger: LoggerService;
  let nestjsModuleGraphs: NestjsModuleGraphsCommand;
  let nxProjectGraphs: NxProjectGraphsCommand;
  let pullRequestTemplate: PullRequestTemplateCommand;
  let skillExclusions: SkillExclusionsCommand;

  /** The delegates in the order the aggregate reports them. */
  function getDelegates(): SynchronizableCommand[] {
    return [
      conformetryGenerators,
      conventionalConfig,
      devcontainerConfiguration,
      nestjsModuleGraphs,
      nxProjectGraphs,
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
        SynchronizationKindsService,
        SynchronizationService,
        {
          provide: ConformetryGeneratorsCommand,
          useValue: createMock<ConformetryGeneratorsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "conformetry-generators",
          }),
        },
        {
          provide: ConventionalConfigCommand,
          useValue: createMock<ConventionalConfigCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "conventional-config",
          }),
        },
        {
          provide: DevcontainerConfigurationCommand,
          useValue: createMock<DevcontainerConfigurationCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "devcontainer-configuration",
          }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NestjsModuleGraphsCommand,
          useValue: createMock<NestjsModuleGraphsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_REPORT,
            synchronizationLabel: "nestjs-module-graphs",
          }),
        },
        {
          provide: NxProjectGraphsCommand,
          useValue: createMock<NxProjectGraphsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "nx-project-graphs",
          }),
        },
        {
          provide: PullRequestTemplateCommand,
          useValue: createMock<PullRequestTemplateCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "pull-request-template",
          }),
        },
        {
          provide: SkillExclusionsCommand,
          useValue: createMock<SkillExclusionsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
            synchronizationLabel: "skill-exclusions",
          }),
        },
      ],
    }).compile();

    command = await module.resolve(SynchronizationCommand);
    conformetryGenerators = await module.resolve(ConformetryGeneratorsCommand);
    conventionalConfig = await module.resolve(ConventionalConfigCommand);
    devcontainerConfiguration = await module.resolve(
      DevcontainerConfigurationCommand,
    );
    logger = await module.resolve(LoggerService);
    nestjsModuleGraphs = await module.resolve(NestjsModuleGraphsCommand);
    nxProjectGraphs = await module.resolve(NxProjectGraphsCommand);
    pullRequestTemplate = await module.resolve(PullRequestTemplateCommand);
    skillExclusions = await module.resolve(SkillExclusionsCommand);
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
        SynchronizationKindsService,
        SynchronizationService,
        {
          provide: ConformetryGeneratorsCommand,
          useValue: createMock<ConformetryGeneratorsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
        },
        {
          provide: ConventionalConfigCommand,
          useValue: createMock<ConventionalConfigCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
        },
        {
          provide: DevcontainerConfigurationCommand,
          useValue: createMock<DevcontainerConfigurationCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: NestjsModuleGraphsCommand,
          useValue: createMock<NestjsModuleGraphsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_REPORT,
          }),
        },
        {
          provide: NxProjectGraphsCommand,
          useValue: createMock<NxProjectGraphsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
        },
        {
          provide: PullRequestTemplateCommand,
          useValue: createMock<PullRequestTemplateCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
        },
        {
          provide: SkillExclusionsCommand,
          useValue: createMock<SkillExclusionsCommand>({
            synchronizationKind: SYNCHRONIZATION_KIND_DERIVATION,
          }),
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
    vi.mocked(conformetryGenerators.synchronize).mockResolvedValue(false);

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

    expect(conformetryGenerators.synchronize).toHaveBeenCalledWith("check");
  });

  // A command registered in the module but left out of the aggregate's own list
  // would never run, and nothing else would notice.
  it("drives every registered command, including skill-exclusions", async () => {
    stubAllDelegates(true);

    await command.run(["check"]);

    expect(skillExclusions.synchronize).toHaveBeenCalledWith("check");
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

    expect(conformetryGenerators.synchronize).not.toHaveBeenCalled();
  });

  // 🧭 Kind selection

  it("keeps the kinds set exactly as it was written", () => {
    expect(command.parseKinds("derivation,report")).toBe("derivation,report");
  });

  it("runs every kind when none was named", async () => {
    stubAllDelegates(true);

    await command.run(["check"]);

    for (const delegate of getDelegates()) {
      expect(delegate.synchronize).toHaveBeenCalledWith("check");
    }
  });

  it("leaves the report synchronization out of a derivation run", async () => {
    stubAllDelegates(true);

    await command.run(["check"], { kinds: "derivation" });

    expect(nestjsModuleGraphs.synchronize).not.toHaveBeenCalled();
    expect(conformetryGenerators.synchronize).toHaveBeenCalledWith("check");
  });

  it("runs the report synchronization alone when reports were named", async () => {
    stubAllDelegates(true);

    await command.run(["write"], { kinds: "report" });

    expect(nestjsModuleGraphs.synchronize).toHaveBeenCalledWith("write");
    expect(conformetryGenerators.synchronize).not.toHaveBeenCalled();
  });

  it("passes a derivation run whose only drift is in a report", async () => {
    stubAllDelegates(true);
    vi.mocked(nestjsModuleGraphs.synchronize).mockResolvedValue(false);

    await expect(
      command.synchronize("check", new Set([SYNCHRONIZATION_KIND_DERIVATION])),
    ).resolves.toBe(true);
  });

  it("exits with code 1 on a kind it does not accept", async () => {
    stubAllDelegates(true);

    await expectProcessExitOne(async () => {
      await command.run(["check"], { kinds: "reports" });
    });

    expect(conformetryGenerators.synchronize).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Rejected the command line",
      undefined,
      {
        reasons: [
          `--kinds does not accept "reports". It takes a comma-separated set drawn from "derivation" and "report", as in "--kinds derivation,report".`,
        ],
      },
    );
  });

  it("exits with code 1 on a kinds flag carrying no value", async () => {
    stubAllDelegates(true);

    await expectProcessExitOne(async () => {
      await command.run(["check"], { kinds: true });
    });

    expect(conformetryGenerators.synchronize).not.toHaveBeenCalled();
  });

  it("fails rather than reporting success when a selection matches nothing", async () => {
    stubAllDelegates(true);

    await expect(command.synchronize("check", new Set())).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "🚦 Selected no synchronization at all",
      undefined,
      { kinds: [] },
    );
  });

  it("drives every kind when a caller says nothing about kinds", async () => {
    stubAllDelegates(true);

    await expect(command.synchronize("check")).resolves.toBe(true);
    expect(nestjsModuleGraphs.synchronize).toHaveBeenCalledWith("check");
  });
});
