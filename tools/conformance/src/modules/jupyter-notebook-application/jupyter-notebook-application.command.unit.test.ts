import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { ResolverService } from "../generator/resolver.service";
import { LoggerService } from "../logger/logger.service";

import { JupyterNotebookApplicationCommand } from "./jupyter-notebook-application.command";

describe(JupyterNotebookApplicationCommand, () => {
  let command: JupyterNotebookApplicationCommand;

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

    generatorService.buildNameSubstitutions.mockImplementation((name) => {
      return {
        nameCamelCase: "unitTestJupyterNotebook",
        nameKebabCase: name,
        namePascalCase: "UnitTestJupyterNotebook",
        nameSnakeCase: "unit_test_jupyter_notebook",
      };
    });
    generatorService.buildLogMessage.mockImplementation((arguments_) => {
      return `${arguments_.emoji} ${arguments_.label}: ${JSON.stringify(arguments_.data)}`;
    });
    resolverService.resolveName.mockImplementation(async (arguments_) => {
      return await Promise.resolve(arguments_.value ?? "prompted-notebook");
    });
    generatorService.generateFiles.mockImplementation(async (arguments_) => {
      const { instanceDirectoryPath, tree } = arguments_;
      tree.write(
        `${instanceDirectoryPath}/pyproject.toml`,
        'name = "todo-replace-package-name"',
      );
      return await Promise.resolve([
        `${instanceDirectoryPath}/pyproject.toml`,
        `${instanceDirectoryPath}/README.md`,
      ]);
    });

    const module = await Test.createTestingModule({
      providers: [
        JupyterNotebookApplicationCommand,
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
    command = await module.resolve(JupyterNotebookApplicationCommand);
  });

  it("sets logger context (template conformance)", async () => {
    // template-conformance-logger-context
    const module = await Test.createTestingModule({
      providers: [
        JupyterNotebookApplicationCommand,
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
      "JupyterNotebookApplicationCommand",
    );
  });

  it("is defined", () => {
    expect(command).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        JupyterNotebookApplicationCommand,
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
      "JupyterNotebookApplicationCommand",
    );
  });

  it("delegates name resolution to generator service", async () => {
    resolverService.resolveName.mockResolvedValueOnce("alpha-notebook");

    await expect(command.resolveName("alpha-notebook")).resolves.toBe(
      "alpha-notebook",
    );

    expect(resolverService.resolveName).toHaveBeenCalledWith({
      message:
        "What is the name of the Jupyter notebook application? (kebab-case)",
      value: "alpha-notebook",
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
    const notebookName = `unit-test-jupyter-notebook-${Date.now().toString()}`;

    await command.run([], {
      name: notebookName,
    });

    expect(generatorService.generateFiles).toHaveBeenCalledWith(
      expect.objectContaining({
        instanceDirectoryPath: `applications/${notebookName}`,
        templateDirectoryPath:
          "tools/conformance/src/modules/jupyter-notebook-application/templates",
      }),
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      1,
      `📓 Jupyter notebook application options: {"input":{"name":"${notebookName}"},"resolved":{"name":"${notebookName}"}}`,
    );
    expect(loggerService.log).toHaveBeenNthCalledWith(
      2,
      `📓 Jupyter notebook application output files: ["applications/${notebookName}/pyproject.toml","applications/${notebookName}/README.md"]`,
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

  it("propagates generation errors", async () => {
    generatorService.generateFiles.mockRejectedValueOnce(
      new Error("generation failed"),
    );

    await expect(
      command.run([], {
        name: "failing-notebook",
      }),
    ).rejects.toThrow("generation failed");
  });
});
