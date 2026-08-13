import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { NestjsServiceFileCommand } from "./nestjs-service-file.command";

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

describe(NestjsServiceFileCommand, () => {
  let command: NestjsServiceFileCommand;

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
      "applications/my-app/src/modules/alpha/user-profile.service.ts",
      "applications/my-app/src/modules/alpha/user-profile.service.unit.test.ts",
    ]);
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "prompted-service");
    });
    resolverService.resolveProject.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "my-app");
    });
    resolverService.resolveModule.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "alpha");
    });

    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceFileCommand,
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
    command = await module.resolve(NestjsServiceFileCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceFileCommand,
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

    expect(logger.setContext).toHaveBeenCalledWith("NestjsServiceFileCommand");
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceFileCommand,
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

    expect(logger.setContext).toHaveBeenCalledWith("NestjsServiceFileCommand");
  });

  it("resolves valid option values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("user-profile");
    resolverService.resolveProject.mockResolvedValueOnce("my-app");
    resolverService.resolveModule.mockResolvedValueOnce("alpha");

    await expect(command.resolveName("user-profile")).resolves.toBe(
      "user-profile",
    );
    await expect(command.resolveProject("my-app")).resolves.toBe("my-app");
    await expect(
      command.resolveModule({
        module: "alpha",
        projectName: "my-app",
      }),
    ).resolves.toBe("alpha");
  });

  it("delegates module resolution to generator service", async () => {
    resolverService.resolveModule.mockResolvedValueOnce("alpha");

    await expect(
      command.resolveModule({
        module: "alpha",
        projectName: "my-app",
      }),
    ).resolves.toBe("alpha");

    const firstCallArguments = resolverService.resolveModule.mock.calls[0]?.[0];

    expect(firstCallArguments).toBeDefined();

    if (!firstCallArguments) {
      return;
    }

    expect(firstCallArguments.message).toBe(
      "Which module should the service files be generated in?",
    );
    expect(firstCallArguments.project).toBe("my-app");
    expect(firstCallArguments.tree).toBeDefined();
    expect(firstCallArguments.value).toBe("alpha");
  });

  it("delegates project resolution to generator service", async () => {
    resolverService.resolveProject.mockResolvedValueOnce("my-app");

    await expect(command.resolveProject("my-app")).resolves.toBe("my-app");

    expect(resolverService.resolveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which project should the service files be generated in?",
        tag: "framework:nestjs",
        value: "my-app",
      }),
    );
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("user-profile");

    await expect(command.resolveName("user-profile")).resolves.toBe(
      "user-profile",
    );

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message: "What is the name of the service? (kebab-case)",
      value: "user-profile",
    });
  });

  it("rejects invalid module selection", async () => {
    resolverService.resolveModule.mockRejectedValueOnce(
      new Error(
        'Module "missing-module" does not exist in project "my-app". Available modules: alpha',
      ),
    );

    await expect(
      command.resolveModule({
        module: "missing-module",
        projectName: "my-app",
      }),
    ).rejects.toThrow(
      'Module "missing-module" does not exist in project "my-app". Available modules: alpha',
    );
  });

  it("rejects invalid direct name and project values", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name must be in kebab-case"),
    );
    resolverService.resolveProject.mockRejectedValueOnce(
      new Error(
        'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
      ),
    );

    await expect(command.resolveName("PromptedService")).rejects.toThrow(
      "Name must be in kebab-case",
    );
    await expect(command.resolveProject("missing-project")).rejects.toThrow(
      'Project "missing-project" does not have the "framework:nestjs" tag. Available projects: my-app',
    );
  });

  it("prompts for missing name and project values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("prompted-service");
    resolverService.resolveProject.mockResolvedValueOnce("my-app");

    await expect(command.resolveName(undefined)).resolves.toBe(
      "prompted-service",
    );
    await expect(command.resolveProject(undefined)).resolves.toBe("my-app");
  });

  it("prompts for module when module option is missing", async () => {
    resolverService.resolveModule.mockResolvedValueOnce("alpha");

    await expect(
      command.resolveModule({
        projectName: "my-app",
      }),
    ).resolves.toBe("alpha");
  });

  it("propagates module resolution errors", async () => {
    resolverService.resolveModule.mockRejectedValueOnce(
      new Error("Module is required"),
    );

    await expect(
      command.resolveModule({
        projectName: "my-app",
      }),
    ).rejects.toThrow("Module is required");
  });

  it("runs generator orchestration", async () => {
    await command.run([], {
      module: "alpha",
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
        instanceDirectoryPath: "applications/my-app/src/modules/alpha",
        templateDirectoryPath:
          "tools/conformance/src/modules/nestjs-service-file/templates",
      }),
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      '🛠️ NestJS service file options: {"input":{"module":"alpha","name":"user-profile","project":"my-app"},"resolved":{"module":"alpha","name":"user-profile","project":"my-app"}}',
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      '🛠️ NestJS service file output files: ["applications/my-app/src/modules/alpha/user-profile.service.ts","applications/my-app/src/modules/alpha/user-profile.service.unit.test.ts"]',
    );
  });
});
