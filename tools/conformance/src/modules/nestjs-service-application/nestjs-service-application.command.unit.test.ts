import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { NestjsServiceApplicationCommand } from "./nestjs-service-application.command";

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

describe(NestjsServiceApplicationCommand, () => {
  let command: NestjsServiceApplicationCommand;

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

    generatorService.buildNameSubstitutions.mockReturnValue({
      nameCamelCase: "myServiceApp",
      nameKebabCase: "my-service-app",
      namePascalCase: "MyServiceApp",
      nameSnakeCase: "my_service_app",
    });
    generatorService.buildLogMessage.mockImplementation((arguments_) => {
      return `${arguments_.emoji} ${arguments_.label}: ${JSON.stringify(arguments_.data)}`;
    });
    generatorService.generateFiles.mockResolvedValue([
      "applications/unit-test-service-app/project.json",
      "applications/unit-test-service-app/src/main.ts",
    ]);
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "prompted-service-app");
    });
    resolverService.resolveType.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "applications");
    });

    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceApplicationCommand,
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
    command = await module.resolve(NestjsServiceApplicationCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceApplicationCommand,
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
      "NestjsServiceApplicationCommand",
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsServiceApplicationCommand,
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
      "NestjsServiceApplicationCommand",
    );
  });

  it("resolves valid option values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("my-service-app");
    resolverService.resolveType.mockResolvedValueOnce("applications");

    await expect(command.resolveName("my-service-app")).resolves.toBe(
      "my-service-app",
    );
    await expect(command.resolveType("applications")).resolves.toBe(
      "applications",
    );
  });

  it("delegates type resolution to generator service", async () => {
    resolverService.resolveType.mockResolvedValueOnce("tools");

    await expect(command.resolveType("tools")).resolves.toBe("tools");

    const firstCallArguments = resolverService.resolveType.mock.calls[0]?.[0];

    expect(firstCallArguments).toBeDefined();

    if (!firstCallArguments) {
      return;
    }

    expect(firstCallArguments).not.toHaveProperty("initialChoice");
    expect(firstCallArguments.message).toBe(
      "What type of NestJS service application should be generated?",
    );
    expect(firstCallArguments.value).toBe("tools");
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("my-service-app");

    await expect(command.resolveName("my-service-app")).resolves.toBe(
      "my-service-app",
    );

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message: "What is the name of the application? (kebab-case)",
      value: "my-service-app",
    });
  });

  it("prompts for name when option is missing", async () => {
    resolverService.resolveName.mockResolvedValueOnce("prompted-service-app");

    await expect(command.resolveName(undefined)).resolves.toBe(
      "prompted-service-app",
    );
  });

  it("rejects invalid type", async () => {
    resolverService.resolveType.mockRejectedValueOnce(
      new Error(
        'Type "invalid-root" is not valid. Allowed values: applications, packages, tools',
      ),
    );

    await expect(command.resolveType("invalid-root")).rejects.toThrow(
      'Type "invalid-root" is not valid. Allowed values: applications, packages, tools',
    );
  });

  it("propagates type resolution errors", async () => {
    resolverService.resolveType.mockRejectedValueOnce(
      new Error("Type is required"),
    );

    await expect(command.resolveType(undefined)).rejects.toThrow(
      "Type is required",
    );
  });

  it("rejects invalid direct name values", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name must be in kebab-case"),
    );

    await expect(command.resolveName("PromptedServiceApp")).rejects.toThrow(
      "Name must be in kebab-case",
    );
  });

  it("propagates name resolution errors", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name is required"),
    );

    await expect(command.resolveName(undefined)).rejects.toThrow(
      "Name is required",
    );
  });

  it("scaffolds a NestJS service application without nest-commander bootstrapping", async () => {
    await command.run([], {
      name: "unit-test-service-app",
      type: "applications",
    });

    expect(generatorService.generateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceDirectoryPath: "applications/unit-test-service-app",
        templateDirectoryPath:
          "tools/conformance/src/modules/nestjs-service-application/templates",
      }),
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      '🖥️ NestJS service application options: {"input":{"name":"unit-test-service-app","type":"applications"},"resolved":{"name":"unit-test-service-app","type":"applications"}}',
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      '🖥️ NestJS service application output files: ["applications/unit-test-service-app/project.json","applications/unit-test-service-app/src/main.ts"]',
    );
  });

  it("throws when target directory already exists", async () => {
    await expect(
      command.run([], {
        name: "affirmations",
        type: "applications",
      }),
    ).rejects.toThrow(
      'Directory "applications/affirmations" already exists. Directory already exists. Choose a different application name.',
    );
  });
});
