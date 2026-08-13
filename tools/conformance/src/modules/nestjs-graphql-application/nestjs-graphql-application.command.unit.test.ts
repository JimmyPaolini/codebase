import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { NestjsGraphqlApplicationCommand } from "./nestjs-graphql-application.command";

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

describe(NestjsGraphqlApplicationCommand, () => {
  let command: NestjsGraphqlApplicationCommand;

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
      nameCamelCase: "atlasApi",
      nameKebabCase: "atlas-api",
      namePascalCase: "AtlasApi",
      nameSnakeCase: "atlas_api",
    });
    generatorService.buildLogMessage.mockImplementation((arguments_) => {
      return `${arguments_.emoji} ${arguments_.label}: ${JSON.stringify(arguments_.data)}`;
    });
    generatorService.generateFiles.mockResolvedValue([
      "applications/atlas-api/project.json",
      "applications/atlas-api/src/main.ts",
    ]);
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "prompted-graphql-app");
    });

    const module = await Test.createTestingModule({
      providers: [
        NestjsGraphqlApplicationCommand,
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
    command = await module.resolve(NestjsGraphqlApplicationCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        NestjsGraphqlApplicationCommand,
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
      "NestjsGraphqlApplicationCommand",
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsGraphqlApplicationCommand,
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
      "NestjsGraphqlApplicationCommand",
    );
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("atlas-api");

    await expect(command.resolveName("atlas-api")).resolves.toBe("atlas-api");

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message: "What is the name of the application? (kebab-case)",
      value: "atlas-api",
    });
  });

  it("propagates name resolution errors", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name is required"),
    );

    await expect(command.resolveName(undefined)).rejects.toThrow(
      "Name is required",
    );
  });

  it("runs generator orchestration", async () => {
    await command.run([], {
      name: "atlas-api",
    });

    expect(generatorService.generateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceDirectoryPath: "applications/atlas-api",
        templateDirectoryPath:
          "tools/conformance/src/modules/nestjs-graphql-application/templates",
      }),
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      '🕸️ NestJS GraphQL application options: {"input":{"name":"atlas-api"},"resolved":{"name":"atlas-api"}}',
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      '🕸️ NestJS GraphQL application output files: ["applications/atlas-api/project.json","applications/atlas-api/src/main.ts"]',
    );
  });

  it("throws when target directory already exists", async () => {
    await expect(
      command.run([], {
        name: "affirmations",
      }),
    ).rejects.toThrow(
      'Directory "applications/affirmations" already exists. Directory already exists. Choose a different application name.',
    );
  });
});
