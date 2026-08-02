import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { ConventionalConfigIoService } from "./conventional-config-io.service";
import { ConventionalConfigValidatorsService } from "./conventional-config-validators.service";

import type { ConventionalConfig } from "./conventional-config.types";

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
  };
});

describe(ConventionalConfigValidatorsService, () => {
  let io: ConventionalConfigIoService;
  let logger: LoggerService;
  let service: ConventionalConfigValidatorsService;

  const workspaceRoot = process.cwd();
  const config: ConventionalConfig = {
    scopes: [{ description: "tools scope", name: "tools" }],
    types: [{ code: "fix", description: "fixing", emoji: "🐛", name: "fix" }],
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigValidatorsService,
        {
          provide: ConventionalConfigIoService,
          useValue: createMock<ConventionalConfigIoService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    io = await module.resolve(ConventionalConfigIoService);
    logger = await module.resolve(LoggerService);
    service = await module.resolve(ConventionalConfigValidatorsService);
  });

  beforeEach(() => {
    fileContents.clear();
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConventionalConfigValidatorsService,
        {
          provide: ConventionalConfigIoService,
          useValue: createMock<ConventionalConfigIoService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const localLogger = await module.resolve(LoggerService);

    expect(localLogger.setContext).toHaveBeenCalledWith(
      "ConventionalConfigValidatorsService",
    );
  });

  it("validates matching settings scopes", () => {
    expect(service.checkSettingsSync(["tools"], ["tools"])).toBe(true);
  });

  it.each([
    {
      currentScopes: ["tools"],
      expectedAbsentLogMessages: [
        "🔀 Scopes have matching values but different ordering\n",
      ],
      expectedPresentLogMessages: [
        "❌ settings.json scopes are out of sync\n",
        "  Missing in settings.json (1 items):",
        "  Extra in settings.json (1 items):",
      ],
      scenarioName: "detects settings scope mismatch",
      targetScopes: ["other"],
    },
    {
      currentScopes: ["tools", "alpha"],
      expectedAbsentLogMessages: [
        "  Extra in settings.json (1 items):",
        "🔀 Scopes have matching values but different ordering\n",
      ],
      expectedPresentLogMessages: ["  Missing in settings.json (1 items):"],
      scenarioName:
        "reports only missing settings values when target is subset",
      targetScopes: ["tools"],
    },
    {
      currentScopes: ["tools"],
      expectedAbsentLogMessages: [
        "  Missing in settings.json (1 items):",
        "🔀 Scopes have matching values but different ordering\n",
      ],
      expectedPresentLogMessages: ["  Extra in settings.json (1 items):"],
      scenarioName:
        "reports only extra settings values when target has additions",
      targetScopes: ["tools", "alpha"],
    },
    {
      currentScopes: ["tools", "alpha"],
      expectedAbsentLogMessages: [
        "  Missing in settings.json (1 items):",
        "  Extra in settings.json (1 items):",
      ],
      expectedPresentLogMessages: [
        "🔀 Scopes have matching values but different ordering\n",
      ],
      scenarioName: "detects settings ordering drift when values match",
      targetScopes: ["alpha", "tools"],
    },
  ])(
    "$scenarioName",
    ({
      currentScopes,
      expectedAbsentLogMessages,
      expectedPresentLogMessages,
      targetScopes,
    }) => {
      expect(service.checkSettingsSync(currentScopes, targetScopes)).toBe(
        false,
      );

      for (const expectedLogMessage of expectedPresentLogMessages) {
        expect(logger.log).toHaveBeenCalledWith(expectedLogMessage);
      }

      for (const expectedLogMessage of expectedAbsentLogMessages) {
        expect(logger.log).not.toHaveBeenCalledWith(expectedLogMessage);
      }
    },
  );

  it("detects issue template scope drift and ordering drift", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/bug.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateScopes).mockReturnValueOnce(["other"]);

    expect(service.checkIssueTemplateSync(["tools"], templateFile)).toBe(false);

    vi.mocked(io.parseIssueTemplateScopes).mockReturnValueOnce([
      "tools",
      "alpha",
    ]);

    expect(
      service.checkIssueTemplateSync(["alpha", "tools"], templateFile),
    ).toBe(false);
  });

  it("validates issue template when scopes match exactly", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/bug.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateScopes).mockReturnValueOnce(["tools"]);

    expect(service.checkIssueTemplateSync(["tools"], templateFile)).toBe(true);
  });

  it("detects missing issue template markers", () => {
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/bug.yml",
    );
    fileContents.set(templateFile, "template-content");
    vi.mocked(io.parseIssueTemplateScopes).mockReturnValueOnce([]);

    expect(service.checkIssueTemplateSync(["tools"], templateFile)).toBe(false);
    expect(logger.log).toHaveBeenCalledWith(
      expect.stringContaining("missing <!-- scopes-start/end --> markers"),
    );
  });

  it.each([
    {
      checkerName: "checkReleaseRulesSync",
      expectedResult: true,
      sourceTypes: ["fix"],
      targetTypes: ["fix"],
    },
    {
      checkerName: "checkReleaseRulesSync",
      expectedResult: false,
      sourceTypes: ["fix"],
      targetTypes: [],
    },
    {
      checkerName: "checkPresetConfigSync",
      expectedResult: true,
      sourceTypes: ["fix"],
      targetTypes: ["fix"],
    },
    {
      checkerName: "checkPresetConfigSync",
      expectedResult: false,
      sourceTypes: ["fix"],
      targetTypes: [],
    },
  ])(
    "$checkerName returns $expectedResult for source $sourceTypes and target $targetTypes",
    ({ checkerName, expectedResult, sourceTypes, targetTypes }) => {
      const checkResult =
        checkerName === "checkReleaseRulesSync"
          ? service.checkReleaseRulesSync(
              sourceTypes,
              targetTypes,
              "release.config.cjs",
            )
          : service.checkPresetConfigSync(
              sourceTypes,
              targetTypes,
              "release.config.cjs",
            );

      expect(checkResult).toBe(expectedResult);
    },
  );

  it("validates skill marker sync and missing marker handling", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    fileContents.set(skillFile, "skill-content");

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `fix` | desc |\n")
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(true);

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues).mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(false);
  });

  it("detects skill marker value and ordering drift", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    fileContents.set(skillFile, "skill-content");

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `other` | desc |\n")
      .mockReturnValueOnce("| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["other"])
      .mockReturnValueOnce(["tools"]);

    expect(service.checkSkillSync(config, skillFile)).toBe(false);

    vi.mocked(io.extractMarkerContent)
      .mockReturnValueOnce("| `fix` | desc |\n")
      .mockReturnValueOnce("| `alpha` | desc |\n| `tools` | desc |\n");
    vi.mocked(io.parseMarkdownTableValues)
      .mockReturnValueOnce(["fix"])
      .mockReturnValueOnce(["alpha", "tools"]);

    expect(
      service.checkSkillSync(
        {
          scopes: [
            { description: "tools scope", name: "tools" },
            { description: "alpha scope", name: "alpha" },
          ],
          types: config.types,
        },
        skillFile,
      ),
    ).toBe(false);
  });

  it("aggregates all skills and templates validation", () => {
    const skillFile = path.join(workspaceRoot, ".agents/skills/test/SKILL.md");
    const templateFile = path.join(
      workspaceRoot,
      ".github/ISSUE_TEMPLATE/bug.yml",
    );

    const checkSkillSyncSpy = vi
      .spyOn(service, "checkSkillSync")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(service.checkAllSkillsSync(config, [skillFile, skillFile])).toBe(
      false,
    );

    checkSkillSyncSpy.mockRestore();

    const checkIssueTemplateSyncSpy = vi
      .spyOn(service, "checkIssueTemplateSync")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    expect(
      service.checkAllTemplatesSync(["tools"], [templateFile, templateFile]),
    ).toBe(false);

    checkIssueTemplateSyncSpy.mockRestore();
  });
});
