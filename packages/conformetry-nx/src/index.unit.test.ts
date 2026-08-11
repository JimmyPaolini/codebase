import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

type CommandRunMock = ReturnType<
  typeof vi.fn<(...args: unknown[]) => Promise<void>>
>;

interface CreateWithoutRunningResult {
  close: ReturnType<typeof vi.fn<() => Promise<void>>>;
  get: ReturnType<typeof vi.fn<() => { run: CommandRunMock }>>;
}

const {
  mockClose,
  mockCreateWithoutRunning,
  mockGenerateRun,
  mockGet,
  mockValidateRun,
} = vi.hoisted(() => {
  return {
    mockClose: vi.fn<() => Promise<void>>(),
    mockCreateWithoutRunning:
      vi.fn<() => Promise<CreateWithoutRunningResult>>(),
    mockGenerateRun: vi.fn<(...args: unknown[]) => Promise<void>>(),
    mockGet: vi.fn<() => { run: CommandRunMock }>(),
    mockValidateRun: vi.fn<(...args: unknown[]) => Promise<void>>(),
  };
});

vi.mock("@jimmypaolini/conformetry", () => {
  return {
    GenerateCommand: function GenerateCommand(): void {},
    MainModule: function MainModule(): void {},
    normalizeRuntimeOptions: (options: Record<string, unknown>) => {
      const normalizedInputs: Record<string, string | undefined> = {};

      for (const [key, value] of Object.entries(options)) {
        if (typeof value === "string") {
          normalizedInputs[key] = value;
          continue;
        }

        if (typeof value === "number" || typeof value === "boolean") {
          normalizedInputs[key] = `${value}`;
          continue;
        }

        if (value === undefined) {
          normalizedInputs[key] = undefined;
          continue;
        }

        normalizedInputs[key] = JSON.stringify(value);
      }

      return normalizedInputs;
    },
    resolveConfigurationPath: (args: {
      defaultConfigurationPath?: string;
      options: Record<string, unknown>;
      pluginOptions?: {
        configFilePath?: string;
      };
    }) => {
      if (typeof args.options["config"] === "string") {
        return args.options["config"];
      }

      if (typeof args.pluginOptions?.configFilePath === "string") {
        return args.pluginOptions.configFilePath;
      }

      return (
        args.defaultConfigurationPath ?? "configuration/conformetry.config.ts"
      );
    },
    resolveTargetDirectoryPath: (args: {
      generatorName: string;
      options: Record<string, unknown>;
    }) => {
      const outputPath = args.options["outputPath"];
      if (typeof outputPath === "string") {
        return outputPath;
      }

      return `generated/${args.generatorName}`;
    },
    ValidateCommand: function ValidateCommand(): void {},
  };
});

vi.mock("nest-commander", () => {
  return {
    CommandFactory: {
      createWithoutRunning: mockCreateWithoutRunning,
    },
  };
});

import conformetryPluginDefinition, {
  generateJupyterNotebookApplication,
  generateNestjsCommandApplication,
  generateNestjsCommandModule,
  generateNestjsDataloaderModule,
  generateNestjsGraphqlApplication,
  generateNestjsGraphqlModule,
  generateNestjsServiceFile,
  generateNestjsServiceModule,
  generateNestjsServicePackage,
  generateReactComponent,
} from "./index.js";

import type { Tree } from "@nx/devkit";

function createStubTree(): Tree {
  function read(pathName: string): Buffer | null;
  function read(pathName: string, encoding: BufferEncoding): null | string;
  function read(
    pathName: string,
    encoding?: BufferEncoding,
  ): Buffer | null | string {
    if (pathName !== "nx.json") {
      return null;
    }

    const nxJson = {
      plugins: [
        {
          options: {
            configFilePath: "configuration/plugin.conformetry.config.ts",
            templateRuleNamesByProjectTag: {
              "framework:nest-commander": [
                "nestjs-command-project",
                "nestjs-command-module",
                "nestjs-service-file",
                "nestjs-service-module",
              ],
            },
          },
          plugin: "@jimmypaolini/conformetry-nx",
        },
      ],
    };
    const content = JSON.stringify(nxJson);

    return encoding === undefined ? Buffer.from(content, "utf8") : content;
  }

  return {
    changePermissions: (_pathName: string, _mode: number) => {},
    children: (_pathName: string) => {
      return [];
    },
    delete: (_pathName: string) => {},
    exists: (pathName: string) => {
      return pathName === "nx.json";
    },
    isFile: (_pathName: string) => {
      return false;
    },
    listChanges: () => {
      return [];
    },
    read,
    rename: (_fromPathName: string, _toPathName: string) => {},
    root: ".",
    write: (_pathName: string, _content: Buffer | string) => {},
  };
}

describe("conformetry-nx index", () => {
  beforeEach(() => {
    mockClose.mockReset();
    mockCreateWithoutRunning.mockReset();
    mockGenerateRun.mockReset();
    mockGet.mockReset();
    mockValidateRun.mockReset();

    mockClose.mockResolvedValue(undefined);
    mockGenerateRun.mockResolvedValue(undefined);
    mockValidateRun.mockResolvedValue(undefined);
    mockGet.mockReturnValue({
      run: mockGenerateRun,
    });
    mockCreateWithoutRunning.mockResolvedValue({
      close: mockClose,
      get: mockGet,
    });
  });

  it("exposes the Nx plugin definition", () => {
    expect(conformetryPluginDefinition.name).toBe(
      "@jimmypaolini/conformetry-nx",
    );
    expect(Array.isArray(conformetryPluginDefinition.createNodes)).toBe(true);
    expect(conformetryPluginDefinition.createNodes[0]).toBe("**/project.json");
    expect(typeof conformetryPluginDefinition.createNodes[1]).toBe("function");
  });

  it("delegates generation to GenerateCommand.run for all exported generators", async () => {
    const tree = createStubTree();
    const generators = [
      {
        generatorName: "jupyter-notebook-application",
        run: generateJupyterNotebookApplication,
      },
      {
        generatorName: "nestjs-command-project",
        run: generateNestjsCommandApplication,
      },
      {
        generatorName: "nestjs-command-module",
        run: generateNestjsCommandModule,
      },
      {
        generatorName: "nestjs-dataloader-module",
        run: generateNestjsDataloaderModule,
      },
      {
        generatorName: "nestjs-graphql-application",
        run: generateNestjsGraphqlApplication,
      },
      {
        generatorName: "nestjs-graphql-module",
        run: generateNestjsGraphqlModule,
      },
      {
        generatorName: "nestjs-service-file",
        run: generateNestjsServiceFile,
      },
      {
        generatorName: "nestjs-service-module",
        run: generateNestjsServiceModule,
      },
      {
        generatorName: "nestjs-service-project",
        run: generateNestjsServicePackage,
      },
      {
        generatorName: "react-component",
        run: generateReactComponent,
      },
    ];

    for (const generator of generators) {
      const callback = await generator.run(tree, {
        componentName: "demo",
        config: "configuration/custom.config.ts",
        outputPath: `generated/${generator.generatorName}`,
      });

      expect(typeof callback).toBe("function");
    }

    expect(mockGenerateRun).toHaveBeenCalledTimes(generators.length);

    for (const [index, generator] of generators.entries()) {
      expect(mockGenerateRun).toHaveBeenNthCalledWith(
        index + 1,
        [
          "generate",
          "--name",
          generator.generatorName,
          "--directory",
          `generated/${generator.generatorName}`,
          "--component-name",
          "demo",
          "--output-path",
          `generated/${generator.generatorName}`,
        ],
        {
          config: "configuration/custom.config.ts",
          name: generator.generatorName,
          targetDirectoryPath: `generated/${generator.generatorName}`,
        },
      );
    }
  });

  it("uses plugin configFilePath from nx.json when config option is omitted", async () => {
    await generateReactComponent(createStubTree(), {
      outputPath: "generated/react-component",
    });

    expect(mockGenerateRun).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        config: "configuration/plugin.conformetry.config.ts",
      }),
    );
  });

  it("infers validation targets only for projects with generator tags", async () => {
    const workspaceDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-nx-create-nodes-"),
    );

    await mkdir(path.join(workspaceDirectory, "applications", "lexico"), {
      recursive: true,
    });
    await mkdir(path.join(workspaceDirectory, "packages", "conformetry-nx"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceDirectory, "applications", "lexico", "project.json"),
      JSON.stringify({ tags: ["framework:react"] }),
      "utf8",
    );
    await writeFile(
      path.join(
        workspaceDirectory,
        "packages",
        "conformetry-nx",
        "project.json",
      ),
      JSON.stringify({ tags: ["generator:nestjs-service-module"] }),
      "utf8",
    );

    const createNodesFunction = conformetryPluginDefinition.createNodes[1];
    const result = await createNodesFunction(
      [
        "applications/lexico/project.json",
        "packages/conformetry-nx/project.json",
      ],
      {
        validationTargetName: "validate-conformetry",
      },
      {
        nxJsonConfiguration: {},
        workspaceRoot: workspaceDirectory,
      },
    );

    expect(result).toStrictEqual([
      [
        "packages/conformetry-nx/project.json",
        {
          projects: {
            "packages/conformetry-nx": {
              targets: {
                "validate-conformetry": {
                  command:
                    "pnpm nx run codebase:conformetry-validate -- --projects=packages/conformetry-nx --rules=nestjs-service-module",
                },
              },
            },
          },
        },
      ],
    ]);
  });
});
