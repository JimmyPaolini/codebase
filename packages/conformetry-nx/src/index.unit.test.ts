import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockIntegrationRunConfiguredGenerator,
  mockNestClose,
  mockNestCreateApplicationContext,
  mockNestGet,
} = vi.hoisted(() => {
  return {
    mockIntegrationRunConfiguredGenerator: vi.fn(),
    mockNestClose: vi.fn(),
    mockNestCreateApplicationContext: vi.fn(),
    mockNestGet: vi.fn(),
  };
});

vi.mock("@jimmypaolini/conformetry", () => {
  return {
    IntegrationModule: { token: "IntegrationModule" },
    IntegrationService: { token: "IntegrationService" },
  };
});

vi.mock("@nestjs/core", () => {
  return {
    NestFactory: {
      createApplicationContext: mockNestCreateApplicationContext,
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
  const read: Tree["read"] = (_pathName: string, encoding?: BufferEncoding) => {
    return encoding === undefined ? null : null;
  };

  return {
    changePermissions: (_pathName: string, _mode: number) => {},
    children: (_pathName: string) => {
      return [];
    },
    delete: (_pathName: string) => {},
    exists: (_pathName: string) => {
      return false;
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
    mockIntegrationRunConfiguredGenerator.mockReset();
    mockNestClose.mockReset();
    mockNestCreateApplicationContext.mockReset();
    mockNestGet.mockReset();

    mockIntegrationRunConfiguredGenerator.mockResolvedValue({
      generatedFilePaths: ["generated/react/example.ts"],
      outputDirectoryPath: "generated/react",
    });
    mockNestGet.mockReturnValue({
      runConfiguredGenerator: mockIntegrationRunConfiguredGenerator,
    });
    mockNestClose.mockResolvedValue(undefined);
    mockNestCreateApplicationContext.mockResolvedValue({
      close: mockNestClose,
      get: mockNestGet,
    });
  });

  it("exposes the Nx plugin definition", () => {
    expect(conformetryPluginDefinition.name).toBe(
      "@jimmypaolini/conformetry-nx",
    );
    expect(Array.isArray(conformetryPluginDefinition.createNodes)).toBe(true);
    expect(conformetryPluginDefinition.createNodes[0]).toBe("**/package.json");
    expect(typeof conformetryPluginDefinition.createNodes[1]).toBe("function");
  });

  it("delegates generation execution to conformetry integration facade", async () => {
    const tree = createStubTree();
    const generators = [
      {
        generatorName: "jupyter-notebook-application",
        run: generateJupyterNotebookApplication,
      },
      {
        generatorName: "nestjs-command-application",
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
        generatorName: "nestjs-service-package",
        run: generateNestjsServicePackage,
      },
      {
        generatorName: "react-component",
        run: generateReactComponent,
      },
    ];

    for (const generator of generators) {
      const callback = await generator.run(tree, {
        config: "configuration/conformetry.config.ts",
        count: 3,
        enabled: true,
        metadata: { level: "advanced" },
        name: "demo",
        targetDirectoryPath: `generated/${generator.generatorName}`,
      });

      expect(typeof callback).toBe("function");
    }

    expect(mockNestCreateApplicationContext).toHaveBeenCalledTimes(
      generators.length,
    );
    expect(mockNestClose).toHaveBeenCalledTimes(generators.length);
    expect(mockIntegrationRunConfiguredGenerator).toHaveBeenCalledTimes(
      generators.length,
    );

    for (const [index, generator] of generators.entries()) {
      expect(mockIntegrationRunConfiguredGenerator).toHaveBeenNthCalledWith(
        index + 1,
        {
          configurationPath: "configuration/conformetry.config.ts",
          generatorInputs: {
            config: "configuration/conformetry.config.ts",
            count: "3",
            enabled: "true",
            metadata: '{"level":"advanced"}',
            name: "demo",
            targetDirectoryPath: `generated/${generator.generatorName}`,
          },
          generatorName: generator.generatorName,
          targetDirectoryPath: `generated/${generator.generatorName}`,
        },
      );
    }
  });

  it("uses the default configuration path when config is omitted", async () => {
    await generateReactComponent(createStubTree(), {
      name: "demo",
      targetDirectoryPath: "generated/react",
    });

    expect(mockIntegrationRunConfiguredGenerator).toHaveBeenCalledWith(
      expect.objectContaining({
        configurationPath: "configuration/conformetry.config.ts",
      }),
    );
  });
});
