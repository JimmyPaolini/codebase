import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerService } from "../logger/logger.service";

import { ValidatorFilesService } from "./validator-files.service";
import { ValidatorRulesService } from "./validator-rules.service";
import { ValidatorWorkspaceService } from "./validator-workspace.service";
import { ValidatorService } from "./validator.service";

describe(ValidatorService, () => {
  let service: ValidatorService;
  const mockLoggerService = createMock<LoggerService>();
  const mockFilesService = createMock<ValidatorFilesService>();
  const mockRulesService = createMock<ValidatorRulesService>();
  const mockWorkspaceService = createMock<ValidatorWorkspaceService>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ValidatorService,
        {
          provide: ValidatorFilesService,
          useValue: mockFilesService,
        },
        {
          provide: ValidatorRulesService,
          useValue: mockRulesService,
        },
        {
          provide: ValidatorWorkspaceService,
          useValue: mockWorkspaceService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = await module.resolve(ValidatorService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("instantiates with injected logger service", () => {
    const validatorService = new ValidatorService(
      mockLoggerService,
      mockFilesService,
      mockRulesService,
      mockWorkspaceService,
    );

    expect(validatorService).toBeDefined();
  });

  it("uses the injected logger and sets context", () => {
    const logger = createMock<LoggerService>();

    const validatorService = new ValidatorService(
      logger,
      mockFilesService,
      mockRulesService,
      mockWorkspaceService,
    );

    expect(validatorService).toBeDefined();
    expect(logger.setContext).toHaveBeenCalledWith("ValidatorService");
  });

  it("exports validator service symbol", () => {
    expect(ValidatorService).toBeDefined();
  });

  it("throws for unknown project names", async () => {
    mockWorkspaceService.readWorkspaceProjects.mockReturnValue([]);
    mockWorkspaceService.resolveSelectedProjectNames.mockImplementation(() => {
      throw new Error('Unknown project "project-that-does-not-exist"');
    });

    await expect(
      service.validate({
        projects: ["project-that-does-not-exist"],
      }),
    ).rejects.toThrow('Unknown project "project-that-does-not-exist"');
  });

  it("throws for unknown validation rules", async () => {
    mockWorkspaceService.readWorkspaceProjects.mockReturnValue([
      {
        rootPath: "/workspace/applications/example",
        tags: ["type:application"],
      },
    ]);
    mockWorkspaceService.resolveSelectedProjectNames.mockReturnValue([
      "example",
    ]);

    await expect(
      service.validate({
        rules: ["unknown-rule"],
      }),
    ).rejects.toThrow("Unknown validation rules: unknown-rule");
  });

  it("uses the default rule list and computes a passing summary", async () => {
    mockWorkspaceService.readWorkspaceProjects.mockReturnValue([
      {
        rootPath: "/workspace/applications/example",
        tags: ["type:application"],
      },
    ]);
    mockWorkspaceService.resolveSelectedProjectNames.mockReturnValue([
      "example",
    ]);
    mockWorkspaceService.resolveProjectByName.mockReturnValue({
      rootPath: "/workspace/applications/example",
      tags: ["type:application"],
    });
    mockWorkspaceService.resolveProjectName.mockReturnValue("example");
    mockRulesService.runRule.mockReturnValue(undefined);

    const result = await service.validate({});

    expect(result.requestedProjects).toStrictEqual(["example"]);
    expect(result.selectedRules.length).toBeGreaterThan(0);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      passed: true,
      projectName: "example",
      projectRootPath: "/workspace/applications/example",
      rules: [],
    });
    expect(result.summary).toMatchObject({
      failedProjectCount: 0,
      projectCount: 1,
      violatedRuleCount: 0,
    });
    expect(result.passed).toBe(true);
  });

  it("wraps serialized rule errors and computes a failing summary", async () => {
    mockWorkspaceService.readWorkspaceProjects.mockReturnValue([
      {
        rootPath: "/workspace/applications/example",
        tags: ["type:application"],
      },
    ]);
    mockWorkspaceService.resolveSelectedProjectNames.mockReturnValue([
      "example",
    ]);
    mockWorkspaceService.resolveProjectByName.mockReturnValue({
      rootPath: "/workspace/applications/example",
      tags: ["type:application"],
    });
    mockWorkspaceService.resolveProjectName.mockReturnValue("example");
    mockRulesService.runRule.mockReturnValue([
      {
        directoryName: "example",
        results: [],
      },
    ]);
    mockFilesService.stringifyConformanceErrors.mockReturnValue(
      "serialized errors",
    );

    const result = await service.validate({ rules: ["nestjs-service-file"] });

    expect(result.passed).toBe(false);
    expect(result.results[0]?.rules[0]).toMatchObject({
      errors: ["serialized errors"],
      passed: false,
      rule: "nestjs-service-file",
      severity: "error",
    });
    expect(result.summary).toMatchObject({
      failedProjectCount: 1,
      projectCount: 1,
      violatedRuleCount: 1,
    });
  });

  it("marks a rule as passed when serialized errors are null", async () => {
    mockWorkspaceService.readWorkspaceProjects.mockReturnValue([
      {
        rootPath: "/workspace/applications/example",
        tags: ["type:application"],
      },
    ]);
    mockWorkspaceService.resolveSelectedProjectNames.mockReturnValue([
      "example",
    ]);
    mockWorkspaceService.resolveProjectByName.mockReturnValue({
      rootPath: "/workspace/applications/example",
      tags: ["type:application"],
    });
    mockWorkspaceService.resolveProjectName.mockReturnValue("example");
    mockRulesService.runRule.mockReturnValue([
      {
        directoryName: "example",
        results: [],
      },
    ]);
    mockFilesService.stringifyConformanceErrors.mockReturnValue(null);

    const result = await service.validate({ rules: ["nestjs-service-file"] });

    expect(result.passed).toBe(true);
    expect(result.results[0]?.rules[0]).toMatchObject({
      errors: [],
      passed: true,
      rule: "nestjs-service-file",
    });
  });
});
