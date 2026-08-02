import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFactory, mockGenerator } = vi.hoisted(() => {
  return {
    mockFactory: vi.fn(),
    mockGenerator: vi.fn(),
  };
});

vi.mock("./modules/nx-adapter/nx-generator-factory", () => {
  return {
    createConformetryGeneratorFactory: mockFactory,
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

async function createConfigurationModule(
  moduleContent: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "conformetry-nx-index-"));
  const filePath = path.join(directory, "conformetry.config.mjs");
  await writeFile(filePath, moduleContent, "utf8");

  return filePath;
}

describe("conformetry-nx index", () => {
  beforeEach(() => {
    mockFactory.mockReset();
    mockGenerator.mockReset();
    mockGenerator.mockResolvedValue(async () => {
      await Promise.resolve();
    });
    mockFactory.mockReturnValue(mockGenerator);
  });

  it("exposes the Nx plugin definition", () => {
    expect(conformetryPluginDefinition.name).toBe(
      "@jimmypaolini/conformetry-nx",
    );
    expect(Array.isArray(conformetryPluginDefinition.createNodes)).toBe(true);
    expect(conformetryPluginDefinition.createNodes[0]).toBe("**/package.json");
    expect(typeof conformetryPluginDefinition.createNodes[1]).toBe("function");
  });

  it("loads workspace configuration and executes every exported generator", async () => {
    const configPath = await createConfigurationModule(`
      export default {
        generators: {
          "jupyter-notebook-application": {
            aliases: ["jna"],
            description: "jupyter",
            name: "jupyter-notebook-application",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/jupyter"
          },
          "nestjs-command-application": {
            name: "nestjs-command-application",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/nca"
          },
          "nestjs-command-module": {
            name: "nestjs-command-module",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/ncm"
          },
          "nestjs-dataloader-module": {
            name: "nestjs-dataloader-module",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/ndm"
          },
          "nestjs-graphql-application": {
            name: "nestjs-graphql-application",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/nga"
          },
          "nestjs-graphql-module": {
            name: "nestjs-graphql-module",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/ngm"
          },
          "nestjs-service-file": {
            name: "nestjs-service-file",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/nsf"
          },
          "nestjs-service-module": {
            name: "nestjs-service-module",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/nsm"
          },
          "react-component": {
            name: "react-component",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/react"
          }
        }
      }
    `);

    const tree = createStubTree();
    const options = { config: configPath, name: "demo" };

    const generators = [
      generateJupyterNotebookApplication,
      generateNestjsCommandApplication,
      generateNestjsCommandModule,
      generateNestjsDataloaderModule,
      generateNestjsGraphqlApplication,
      generateNestjsGraphqlModule,
      generateNestjsServiceFile,
      generateNestjsServiceModule,
      generateReactComponent,
    ];

    for (const generator of generators) {
      await generator(tree, options);
    }

    expect(mockFactory).toHaveBeenCalledTimes(generators.length);
    expect(mockGenerator).toHaveBeenCalledTimes(generators.length);
    expect(mockGenerator).toHaveBeenCalledWith(tree, options);
  });

  it("supports configuration provided via conformetryConfiguration named export", async () => {
    const configPath = await createConfigurationModule(`
      export const conformetryConfiguration = {
        generators: {
          "react-component": {
            name: "react-component",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/react"
          }
        }
      }
    `);

    await generateReactComponent(createStubTree(), {
      config: configPath,
      name: "demo",
    });

    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  it("resolves relative configuration paths from the current working directory", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-nx-relative-config-"),
    );
    const configurationPath = path.join(
      workingDirectory,
      "conformetry.config.mjs",
    );
    await writeFile(
      configurationPath,
      `export default {
        generators: {
          "react-component": {
            name: "react-component",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/react"
          }
        }
      }`,
      "utf8",
    );

    const previousWorkingDirectory = process.cwd();
    process.chdir(workingDirectory);

    try {
      await generateReactComponent(createStubTree(), {
        config: "./conformetry.config.mjs",
        name: "demo",
      });

      expect(mockFactory).toHaveBeenCalledTimes(1);
    } finally {
      process.chdir(previousWorkingDirectory);
    }
  });

  it("throws when a requested generator is missing from configuration", async () => {
    const configPath = await createConfigurationModule(`
      export default {
        generators: {
          "react-component": {
            name: "react-component",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates/react"
          }
        }
      }
    `);

    await expect(
      generateNestjsServiceModule(createStubTree(), { config: configPath }),
    ).rejects.toThrow('Unknown conformetry generator "nestjs-service-module"');
  });

  it("throws when the configuration module is not an object", async () => {
    const configPath = await createConfigurationModule(`export default 42`);

    await expect(
      generateReactComponent(createStubTree(), { config: configPath }),
    ).rejects.toThrow("missing generators map");
  });

  it("throws when configuration is missing the generators map", async () => {
    const configPath = await createConfigurationModule(`export default {}`);

    await expect(
      generateReactComponent(createStubTree(), { config: configPath }),
    ).rejects.toThrow("missing generators map");
  });
});
