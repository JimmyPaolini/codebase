import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { NestjsServiceModuleCommand } from "./nestjs-service-module.command";

const { flushChangesMock } = vi.hoisted(() => {
  return {
    flushChangesMock: vi.fn<() => void>(),
  };
});

vi.mock("nx/src/generators/tree", async (importOriginal) => {
  const importedModule = await importOriginal();

  const actual =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...actual,
    flushChanges: flushChangesMock,
  };
});

describe(NestjsServiceModuleCommand, () => {
  let command: NestjsServiceModuleCommand;

  let generatorService: ReturnType<typeof createMock<GeneratorService>>;
  let resolverService: ReturnType<typeof createMock<ResolverService>>;
  let loggerService: LoggerService;

  beforeAll(async () => {
    generatorService = createMock<GeneratorService>();
    resolverService = createMock<ResolverService>();
    loggerService = createMock<LoggerService>();

    Object.defineProperty(resolverService, "errorMessages", {
      value: {
        moduleEmpty: "Module is required",
        nameCase: "Name must be in kebab-case",
        nameEmpty: "Name is required",
        projectEmpty: "Project is required",
        typeEmpty: "Type is required",
      },
    });

    resolverService.resolveProjectDirectoryPath.mockReturnValue(
      "applications/my-app/src/modules",
    );
    generatorService.buildNameSubstitutions.mockReturnValue({
      nameCamelCase: "userProfile",
      nameKebabCase: "user-profile",
      namePascalCase: "UserProfile",
      nameSnakeCase: "user_profile",
    });
    generatorService.buildLogMessage.mockImplementation((arguments_) => {
      return `${arguments_.emoji} ${arguments_.label}: ${JSON.stringify(arguments_.data)}`;
    });
    generatorService.generateFiles.mockResolvedValue([
      "applications/my-app/src/modules/user-profile/user-profile.module.ts",
      "applications/my-app/src/modules/user-profile/user-profile.service.ts",
    ]);
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(
        arguments_.value ?? "prompted-service-module",
      );
    });
    resolverService.resolveProject.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "my-app");
    });

    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceModuleCommand,
        {
          provide: GeneratorService,
          useValue: generatorService,
        },
        {
          provide: ResolverService,
          useValue: resolverService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    loggerService = await module.resolve(LoggerService);
    command = await module.resolve(NestjsServiceModuleCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceModuleCommand,
        {
          provide: GeneratorService,
          useValue: createMock<GeneratorService>(),
        },
        {
          provide: ResolverService,
          useValue: createMock<ResolverService>(),
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "NestjsServiceModuleCommand",
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceModuleCommand,
        {
          provide: GeneratorService,
          useValue: generatorService,
        },
        {
          provide: ResolverService,
          useValue: resolverService,
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    const logger = await module.resolve(LoggerService);

    expect(logger.setContext).toHaveBeenCalledWith(
      "NestjsServiceModuleCommand",
    );
  });

  it("resolves valid option values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("alpha-module");
    resolverService.resolveProject.mockResolvedValueOnce("my-app");

    await expect(command.resolveName("alpha-module")).resolves.toBe(
      "alpha-module",
    );
    await expect(command.resolveProject("my-app")).resolves.toBe("my-app");
  });

  it("delegates project resolution to generator service", async () => {
    resolverService.resolveProject.mockResolvedValueOnce("my-app");

    await expect(command.resolveProject("my-app")).resolves.toBe("my-app");

    expect(resolverService.resolveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which project should the module be generated in?",
        tag: "framework:nestjs",
        value: "my-app",
      }),
    );
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("alpha-module");

    await expect(command.resolveName("alpha-module")).resolves.toBe(
      "alpha-module",
    );

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message: "What is the name of the module? (kebab-case)",
      value: "alpha-module",
    });
  });

  it("rejects invalid project values", async () => {
    resolverService.resolveProject.mockRejectedValueOnce(
      new Error(
        'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
      ),
    );

    await expect(command.resolveProject("missing-project")).rejects.toThrow(
      'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
    );
  });

  it("propagates name resolution errors", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name must be in kebab-case"),
    );

    await expect(command.resolveName("AlphaModule")).rejects.toThrow(
      "Name must be in kebab-case",
    );
  });

  it("prompts for missing name and project values", async () => {
    resolverService.resolveName.mockResolvedValueOnce(
      "prompted-service-module",
    );
    resolverService.resolveProject.mockResolvedValueOnce("my-app");

    await expect(command.resolveName(undefined)).resolves.toBe(
      "prompted-service-module",
    );
    await expect(command.resolveProject(undefined)).resolves.toBe("my-app");
  });

  it("runs generator orchestration", async () => {
    await command.run([], {
      name: "user-profile",
      project: "my-app",
    });

    expect(resolverService.resolveProjectDirectoryPath).toHaveBeenCalledWith(
      expect.anything(),
      "my-app",
      "src/modules",
    );
    expect(generatorService.generateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceDirectoryPath: "applications/my-app/src/modules/user-profile",
        templateDirectoryPath:
          "tools/conformance/src/modules/nestjs-service-module/templates",
      }),
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      '🧱 NestJS service module options: {"input":{"name":"user-profile","project":"my-app"},"resolved":{"name":"user-profile","project":"my-app"}}',
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      '🧱 NestJS service module output files: ["applications/my-app/src/modules/user-profile/user-profile.module.ts","applications/my-app/src/modules/user-profile/user-profile.service.ts"]',
    );
  });
});
