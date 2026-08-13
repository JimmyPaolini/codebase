import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { ReactComponentCommand } from "./react-component.command";

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

describe(ReactComponentCommand, () => {
  let command: ReactComponentCommand;

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
      "packages/lexico-components/src/components",
    );
    generatorService.buildNameSubstitutions.mockReturnValue({
      nameCamelCase: "alertBanner",
      nameKebabCase: "alert-banner",
      namePascalCase: "AlertBanner",
      nameSnakeCase: "alert_banner",
    });
    generatorService.buildLogMessage.mockImplementation((arguments_) => {
      return `${arguments_.emoji} ${arguments_.label}: ${JSON.stringify(arguments_.data)}`;
    });
    generatorService.generateFiles.mockResolvedValue([
      "packages/lexico-components/src/components/AlertBanner.tsx",
      "packages/lexico-components/src/components/AlertBanner.test.tsx",
    ]);
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "prompted-banner");
    });
    resolverService.resolveProject.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "lexico-components");
    });

    const module = await Test.createTestingModule({
      providers: [
        ReactComponentCommand,
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
    command = await module.resolve(ReactComponentCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        ReactComponentCommand,
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

    expect(logger.setContext).toHaveBeenCalledWith("ReactComponentCommand");
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReactComponentCommand,
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

    expect(logger.setContext).toHaveBeenCalledWith("ReactComponentCommand");
  });

  it("resolves valid option values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("alert-banner");
    resolverService.resolveProject.mockResolvedValueOnce("lexico-components");

    await expect(command.resolveName("alert-banner")).resolves.toBe(
      "alert-banner",
    );
    await expect(command.resolveProject("lexico-components")).resolves.toBe(
      "lexico-components",
    );
  });

  it("delegates project resolution to generator service", async () => {
    resolverService.resolveProject.mockResolvedValueOnce("lexico-components");

    await expect(command.resolveProject("lexico-components")).resolves.toBe(
      "lexico-components",
    );

    expect(resolverService.resolveProject).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Which project should the component be generated in?",
        tag: "framework:react",
        value: "lexico-components",
      }),
    );
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("alert-banner");

    await expect(command.resolveName("alert-banner")).resolves.toBe(
      "alert-banner",
    );

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message: "What is the name of the component? (kebab-case)",
      value: "alert-banner",
    });
  });

  it("rejects invalid project values", async () => {
    resolverService.resolveProject.mockRejectedValueOnce(
      new Error(
        'Project "missing-project" does not have the "framework:react" tag. Available projects: lexico-components',
      ),
    );

    await expect(command.resolveProject("missing-project")).rejects.toThrow(
      'Project "missing-project" does not have the "framework:react" tag. Available projects: lexico-components',
    );
  });

  it("propagates name resolution errors", async () => {
    resolverService.resolveName.mockRejectedValueOnce(
      new Error("Name must be in kebab-case"),
    );

    await expect(command.resolveName("AlertBanner")).rejects.toThrow(
      "Name must be in kebab-case",
    );
  });

  it("prompts for missing name and project values", async () => {
    resolverService.resolveName.mockResolvedValueOnce("prompted-banner");
    resolverService.resolveProject.mockResolvedValueOnce("lexico-components");

    await expect(command.resolveName(undefined)).resolves.toBe(
      "prompted-banner",
    );
    await expect(command.resolveProject(undefined)).resolves.toBe(
      "lexico-components",
    );
  });

  it("runs generator orchestration", async () => {
    await command.run([], {
      name: "alert-banner",
      project: "lexico-components",
    });

    expect(resolverService.resolveProjectDirectoryPath).toHaveBeenCalledWith(
      expect.anything(),
      "lexico-components",
      "src/components",
    );
    expect(generatorService.generateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceDirectoryPath: "packages/lexico-components/src/components",
        templateDirectoryPath:
          "tools/conformance/src/modules/react-component/templates",
      }),
    );
    expect(generatorService.buildLogMessage).toHaveBeenNthCalledWith(1, {
      data: {
        input: {
          name: "alert-banner",
          project: "lexico-components",
        },
        resolved: {
          name: "alert-banner",
          project: "lexico-components",
        },
      },
      emoji: "⚛️",
      label: "React component options",
    });
    expect(generatorService.buildLogMessage).toHaveBeenNthCalledWith(2, {
      data: [
        "packages/lexico-components/src/components/AlertBanner.tsx",
        "packages/lexico-components/src/components/AlertBanner.test.tsx",
      ],
      emoji: "⚛️",
      label: "React component output files",
    });
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      '⚛️ React component options: {"input":{"name":"alert-banner","project":"lexico-components"},"resolved":{"name":"alert-banner","project":"lexico-components"}}',
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      '⚛️ React component output files: ["packages/lexico-components/src/components/AlertBanner.tsx","packages/lexico-components/src/components/AlertBanner.test.tsx"]',
    );
  });
});
