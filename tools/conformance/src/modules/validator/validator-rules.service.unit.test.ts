import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { GeneratorService } from "../generator/generator.service";
import { JupyterNotebookApplicationCommand } from "../jupyter-notebook-application/jupyter-notebook-application.command";
import { NestjsCommandApplicationCommand } from "../nestjs-command-application/nestjs-command-application.command";
import { NestjsCommandModuleCommand } from "../nestjs-command-module/nestjs-command-module.command";
import { NestjsDataloaderModuleCommand } from "../nestjs-dataloader-module/nestjs-dataloader-module.command";
import { NestjsGraphqlApplicationCommand } from "../nestjs-graphql-application/nestjs-graphql-application.command";
import { NestjsGraphqlModuleCommand } from "../nestjs-graphql-module/nestjs-graphql-module.command";
import { NestjsServiceFileCommand } from "../nestjs-service-file/nestjs-service-file.command";
import { NestjsServiceModuleCommand } from "../nestjs-service-module/nestjs-service-module.command";
import { ReactComponentCommand } from "../react-component/react-component.command";

const { mockValidateInstanceDirectory, mockValidateInstanceFile } = vi.hoisted(
  () => ({
    mockValidateInstanceDirectory: vi.fn<(input: unknown) => unknown>(),
    mockValidateInstanceFile: vi.fn<(input: unknown) => unknown>(),
  }),
);

vi.mock("./validator-files.service", () => ({
  ValidatorFilesService: class ValidatorFilesService {
    validateInstanceDirectory = mockValidateInstanceDirectory;
    validateInstanceFile = mockValidateInstanceFile;
  },
}));

import { ValidatorFilesService } from "./validator-files.service";
import { ValidatorRulesService } from "./validator-rules.service";

const JUPYTER_NOTEBOOK_APPLICATION_GENERATOR_TAG =
  "generator:jupyter-notebook-application";
const NESTJS_COMMAND_APPLICATION_GENERATOR_TAG =
  "generator:nestjs-command-application";
const NESTJS_GRAPHQL_APPLICATION_GENERATOR_TAG =
  "generator:nestjs-graphql-application";
const NESTJS_PROJECT_TAG = "framework:nestjs";
const NESTJS_COMMAND_PROJECT_TAG = "framework:nest-commander";
const REACT_PROJECT_TAG = "framework:react";

describe(ValidatorRulesService, () => {
  interface ValidateInstanceFileArgument {
    data: { type?: string };
    instanceFilePath: string;
    templateFilePath: string;
  }

  const isValidateInstanceFileArgument = (
    value: unknown,
  ): value is ValidateInstanceFileArgument => {
    if (typeof value !== "object" || value === null) {
      return false;
    }

    if (
      !("data" in value) ||
      !("instanceFilePath" in value) ||
      !("templateFilePath" in value)
    ) {
      return false;
    }

    if (
      typeof value.instanceFilePath !== "string" ||
      typeof value.templateFilePath !== "string"
    ) {
      return false;
    }

    if (typeof value.data !== "object" || value.data === null) {
      return false;
    }

    return (
      !("type" in value.data) ||
      typeof value.data.type === "string" ||
      value.data.type === undefined
    );
  };

  function getFirstValidateInstanceFileCallArgument():
    | undefined
    | ValidateInstanceFileArgument {
    const firstCall = mockValidateInstanceFile.mock.calls[0];
    if (firstCall === undefined) {
      return undefined;
    }

    const firstArgument = firstCall[0];
    if (isValidateInstanceFileArgument(firstArgument)) {
      return firstArgument;
    }

    return undefined;
  }

  let service: ValidatorRulesService;
  const temporaryDirectories: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GeneratorService,
        {
          provide: JupyterNotebookApplicationCommand,
          useValue: {
            templateDirectoryPath:
              "tools/conformance/src/modules/jupyter-notebook-application/templates",
          },
        },
        {
          provide: NestjsCommandApplicationCommand,
          useValue: {
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-command-application/templates",
          },
        },
        {
          provide: NestjsCommandModuleCommand,
          useValue: {
            tag: NESTJS_COMMAND_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-command-module/templates",
          },
        },
        {
          provide: NestjsDataloaderModuleCommand,
          useValue: {
            tag: NESTJS_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-dataloader-module/templates",
          },
        },
        {
          provide: NestjsGraphqlApplicationCommand,
          useValue: {
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-graphql-application/templates",
          },
        },
        {
          provide: NestjsGraphqlModuleCommand,
          useValue: {
            tag: NESTJS_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-graphql-module/templates",
          },
        },
        {
          provide: NestjsServiceFileCommand,
          useValue: {
            tag: NESTJS_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-service-file/templates",
          },
        },
        {
          provide: NestjsServiceModuleCommand,
          useValue: {
            tag: NESTJS_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/nestjs-service-module/templates",
          },
        },
        {
          provide: ReactComponentCommand,
          useValue: {
            tag: REACT_PROJECT_TAG,
            templateDirectoryPath:
              "tools/conformance/src/modules/react-component/templates",
          },
        },
        ValidatorFilesService,
        ValidatorRulesService,
      ],
    }).compile();

    service = await module.resolve(ValidatorRulesService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();

    while (temporaryDirectories.length > 0) {
      const temporaryDirectory = temporaryDirectories.pop();
      if (temporaryDirectory !== undefined) {
        fs.rmSync(temporaryDirectory, { force: true, recursive: true });
      }
    }
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("returns undefined for rules that do not apply", () => {
    const result = service.runRule({
      ruleName: "nestjs-command-application",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for jupyter-notebook-application when tag is missing", () => {
    const result = service.runRule({
      ruleName: "jupyter-notebook-application",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for command-module when command-application tag is missing", () => {
    const result = service.runRule({
      ruleName: "nestjs-command-module",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for service-module and graphql-module without nestjs application tag", () => {
    const serviceModuleResult = service.runRule({
      ruleName: "nestjs-service-module",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [NESTJS_COMMAND_PROJECT_TAG],
      },
    });

    const graphqlModuleResult = service.runRule({
      ruleName: "nestjs-graphql-module",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [NESTJS_COMMAND_PROJECT_TAG],
      },
    });

    expect(serviceModuleResult).toBeUndefined();
    expect(graphqlModuleResult).toBeUndefined();
  });

  it("runs the Jupyter notebook application rule for tagged projects", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-jupyter-"),
    );
    temporaryDirectories.push(projectRootPath);

    fs.mkdirSync(path.join(projectRootPath, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(projectRootPath, "pyproject.toml"),
      'description = "Notebook project"\n',
    );

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "example",
      results: [],
    });

    const result = service.runRule({
      ruleName: "jupyter-notebook-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [JUPYTER_NOTEBOOK_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(result).toHaveLength(2);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(2);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      descriptionOverride: "Notebook project",
      instanceDirectoryPath: projectRootPath,
      nameOverride: path.basename(projectRootPath),
    });
    expect(mockValidateInstanceDirectory.mock.calls[1]?.[0]).toMatchObject({
      instanceDirectoryPath: path.join(projectRootPath, "src"),
      nameOverride: path.basename(projectRootPath),
    });
  });

  it("uses an empty description when pyproject.toml is missing", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "conformance-validator-rules-jupyter-no-pyproject-",
      ),
    );
    temporaryDirectories.push(projectRootPath);

    fs.mkdirSync(path.join(projectRootPath, "src"), { recursive: true });

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "example",
      results: [],
    });

    const result = service.runRule({
      ruleName: "jupyter-notebook-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [JUPYTER_NOTEBOOK_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(result).toHaveLength(2);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      descriptionOverride: "",
      instanceDirectoryPath: projectRootPath,
    });
  });

  it("uses an empty description when pyproject.toml has no description field", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "conformance-validator-rules-jupyter-missing-description-",
      ),
    );
    temporaryDirectories.push(projectRootPath);

    fs.mkdirSync(path.join(projectRootPath, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(projectRootPath, "pyproject.toml"),
      '[project]\nname = "sample"\n',
    );

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "example",
      results: [],
    });

    const result = service.runRule({
      ruleName: "jupyter-notebook-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [JUPYTER_NOTEBOOK_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(result).toHaveLength(2);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      descriptionOverride: "",
      instanceDirectoryPath: projectRootPath,
    });
  });

  it("returns undefined for untagged graphql-application and service-file rules", () => {
    const graphqlApplicationResult = service.runRule({
      ruleName: "nestjs-graphql-application",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });
    const serviceFileResult = service.runRule({
      ruleName: "nestjs-service-file",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });

    expect(graphqlApplicationResult).toBeUndefined();
    expect(serviceFileResult).toBeUndefined();
  });

  it("returns undefined for untagged dataloader-module and react-component rules", () => {
    const dataloaderModuleResult = service.runRule({
      ruleName: "nestjs-dataloader-module",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });
    const reactComponentResult = service.runRule({
      ruleName: "react-component",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [],
      },
    });

    expect(dataloaderModuleResult).toBeUndefined();
    expect(reactComponentResult).toBeUndefined();
  });

  it("runs the command application rule for tagged projects", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-command-app-"),
    );
    temporaryDirectories.push(projectRootPath);

    mockValidateInstanceFile.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    const result = service.runRule({
      ruleName: "nestjs-command-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_COMMAND_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(result).toBeDefined();
    expect(result?.[0]?.results.length).toBeGreaterThan(0);
    expect(mockValidateInstanceFile).toHaveBeenCalledWith(expect.any(Object));

    const firstCallArgument = getFirstValidateInstanceFileCallArgument();

    expect(firstCallArgument?.data).toBeDefined();
    expect(firstCallArgument?.instanceFilePath).toBeTypeOf("string");
    expect(firstCallArgument?.templateFilePath).toBeTypeOf("string");
  });

  it("falls back type to applications when relative path has no segment", () => {
    const relativeSpy = vi.spyOn(path, "relative").mockReturnValue("");
    const splitSpy = vi
      .spyOn(String.prototype, "split")
      .mockReturnValueOnce([] as string[]);

    mockValidateInstanceFile.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    const projectRootPath = fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        "conformance-validator-rules-destination-root-fallback-project-",
      ),
    );
    temporaryDirectories.push(projectRootPath);

    service.runRule({
      ruleName: "nestjs-command-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_COMMAND_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(mockValidateInstanceFile).toHaveBeenCalledWith(expect.any(Object));

    const firstCallArgument = getFirstValidateInstanceFileCallArgument();

    expect(firstCallArgument?.data.type).toBe("applications");

    relativeSpy.mockRestore();
    splitSpy.mockRestore();
  });

  it("runs the GraphQL application rule for tagged projects", () => {
    const projectRootPath = "/workspace/applications/example";

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "example",
      results: [],
    });

    const result = service.runRule({
      ruleName: "nestjs-graphql-application",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_GRAPHQL_APPLICATION_GENERATOR_TAG],
      },
    });

    expect(result).toHaveLength(1);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(1);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      instanceDirectoryPath: projectRootPath,
    });
  });

  it("filters logger modules and only validates command modules", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-command-"),
    );
    temporaryDirectories.push(projectRootPath);

    const modulesDirectoryPath = path.join(projectRootPath, "src", "modules");
    fs.mkdirSync(path.join(modulesDirectoryPath, "logger"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(modulesDirectoryPath, "alpha"), { recursive: true });
    fs.mkdirSync(path.join(modulesDirectoryPath, "beta"), { recursive: true });
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "alpha", "alpha.command.ts"),
      "export class AlphaCommand {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "alpha", "alpha.module.ts"),
      "export class AlphaModule {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "beta", "beta.module.ts"),
      "export class BetaModule {}\n",
    );

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "alpha",
      results: [],
    });
    mockValidateInstanceFile.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    const result = service.runRule({
      ruleName: "nestjs-command-module",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG, NESTJS_COMMAND_PROJECT_TAG],
      },
    });

    expect(result).toHaveLength(1);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(1);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      instanceDirectoryPath: path.join(modulesDirectoryPath, "alpha"),
    });
  });

  it("filters logger modules and only validates dataloader modules", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-dataloader-"),
    );
    temporaryDirectories.push(projectRootPath);

    const modulesDirectoryPath = path.join(projectRootPath, "src", "modules");
    fs.mkdirSync(path.join(modulesDirectoryPath, "logger"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(modulesDirectoryPath, "alpha"), { recursive: true });
    fs.mkdirSync(path.join(modulesDirectoryPath, "beta"), { recursive: true });
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "alpha", "alpha.dataloader.ts"),
      "export class AlphaDataloader {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "beta", "beta.service.ts"),
      "export class BetaService {}\n",
    );

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "alpha",
      results: [],
    });

    const result = service.runRule({
      ruleName: "nestjs-dataloader-module",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toHaveLength(1);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(1);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      instanceDirectoryPath: path.join(modulesDirectoryPath, "alpha"),
    });
  });

  it("filters GraphQL and service modules from module directories", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-modules-"),
    );
    temporaryDirectories.push(projectRootPath);

    const modulesDirectoryPath = path.join(projectRootPath, "src", "modules");
    fs.mkdirSync(path.join(modulesDirectoryPath, "logger"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(modulesDirectoryPath, "alpha"), { recursive: true });
    fs.mkdirSync(path.join(modulesDirectoryPath, "beta"), { recursive: true });
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "alpha", "alpha.resolver.ts"),
      "export class AlphaResolver {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "alpha", "alpha.module.ts"),
      "export class AlphaModule {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "beta", "beta.module.ts"),
      "export class BetaModule {}\n",
    );
    fs.writeFileSync(
      path.join(modulesDirectoryPath, "beta", "beta.service.ts"),
      "export class BetaService {}\n",
    );
    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "alpha",
      results: [],
    });

    const graphqlResult = service.runRule({
      ruleName: "nestjs-graphql-module",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(graphqlResult).toHaveLength(1);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(1);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      instanceDirectoryPath: path.join(modulesDirectoryPath, "alpha"),
    });

    mockValidateInstanceDirectory.mockClear();

    const serviceResult = service.runRule({
      ruleName: "nestjs-service-module",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(serviceResult).toHaveLength(1);
    expect(mockValidateInstanceDirectory).toHaveBeenCalledTimes(1);
    expect(mockValidateInstanceDirectory.mock.calls[0]?.[0]).toMatchObject({
      instanceDirectoryPath: path.join(modulesDirectoryPath, "beta"),
    });
  });

  it("returns no module directories when the modules root is missing", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-no-modules-"),
    );
    temporaryDirectories.push(projectRootPath);

    const result = service.runRule({
      ruleName: "nestjs-graphql-module",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toStrictEqual([]);
    expect(mockValidateInstanceDirectory).not.toHaveBeenCalled();
  });

  it("returns an empty result set when no service files are found", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-service-empty-"),
    );
    temporaryDirectories.push(projectRootPath);

    const result = service.runRule({
      ruleName: "nestjs-service-file",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toStrictEqual([]);
    expect(mockValidateInstanceDirectory).not.toHaveBeenCalled();
  });

  it("returns an empty result set when no component files are found in react projects", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-react-empty-"),
    );
    temporaryDirectories.push(projectRootPath);

    const result = service.runRule({
      ruleName: "react-component",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [REACT_PROJECT_TAG],
      },
    });

    expect(result).toStrictEqual([]);
    expect(mockValidateInstanceFile).not.toHaveBeenCalled();
  });

  it("validates each discovered service file", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-service-"),
    );
    temporaryDirectories.push(projectRootPath);

    fs.mkdirSync(path.join(projectRootPath, "src", "modules", "alpha"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(projectRootPath, "src", "modules", "beta"), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(projectRootPath, "src", "modules", "alpha", "alpha.service.ts"),
      "export class AlphaService {}\n",
    );
    fs.writeFileSync(
      path.join(projectRootPath, "src", "modules", "beta", "beta.service.ts"),
      "export class BetaService {}\n",
    );

    mockValidateInstanceDirectory.mockReturnValue({
      directoryName: "alpha",
      results: [],
    });

    const result = service.runRule({
      ruleName: "nestjs-service-file",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toHaveLength(2);
    expect(mockValidateInstanceFile).toHaveBeenCalledTimes(4);
  });

  it("validates each discovered react component file", () => {
    const projectRootPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "conformance-validator-rules-react-components-"),
    );
    temporaryDirectories.push(projectRootPath);

    const componentsDirectoryPath = path.join(
      projectRootPath,
      "src",
      "components",
    );
    fs.mkdirSync(componentsDirectoryPath, { recursive: true });
    fs.writeFileSync(
      path.join(componentsDirectoryPath, "Alpha.tsx"),
      "export function Alpha() { return null; }\n",
    );
    fs.writeFileSync(
      path.join(componentsDirectoryPath, "Alpha.test.tsx"),
      "describe('Alpha', () => {});\n",
    );
    fs.writeFileSync(
      path.join(componentsDirectoryPath, "Beta.tsx"),
      "export function Beta() { return null; }\n",
    );
    fs.writeFileSync(
      path.join(componentsDirectoryPath, "Beta.test.tsx"),
      "describe('Beta', () => {});\n",
    );

    mockValidateInstanceFile.mockReturnValue({
      errors: [],
      instanceFilePath: "instance-file",
      templateFilePath: "template-file",
    });

    const result = service.runRule({
      ruleName: "react-component",
      workspaceProject: {
        rootPath: projectRootPath,
        tags: [REACT_PROJECT_TAG],
      },
    });

    expect(result).toHaveLength(2);
    expect(mockValidateInstanceFile).toHaveBeenCalledTimes(4);
  });

  it("returns undefined for unknown rule names through default branch", () => {
    const result = service.runRule({
      ruleName: "unknown-rule",
      workspaceProject: {
        rootPath: "/workspace/project",
        tags: [NESTJS_PROJECT_TAG],
      },
    });

    expect(result).toBeUndefined();
  });
});
