import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import { conformetryConfigurationSchema } from "../../constants.js";

import { UnknownConfigurationFileTypeError } from "./configuration.errors.js";
import { ConfigurationService } from "./configuration.service.js";

describe("configurationService.loadConformetryConfiguration", () => {
  it("loads the repository conformetry config from the root configuration file", async () => {
    const configurationService = new ConfigurationService();
    const configuration =
      await configurationService.loadConformetryConfiguration(
        "configuration/conformetry.config.ts",
      );

    expect(configuration.generators["react-component"]).toBeDefined();
  });

  it("throws a typed error for unsupported configuration extensions", async () => {
    const configurationService = new ConfigurationService();

    await expect(
      configurationService.loadConformetryConfiguration(
        "configuration/does-not-exist.yaml",
      ),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("loads a JSON configuration file", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-json-"),
    );
    const configurationPath = path.join(workingDirectory, "conformetry.json");
    await writeFile(
      configurationPath,
      JSON.stringify({
        generators: {
          demo: {
            aliases: ["d"],
            description: "demo generator",
            hooks: {
              postGenerate: { name: "post-hook" },
              preGenerate: { name: "pre-hook" },
            },
            name: "demo",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates",
          },
        },
      }),
      "utf8",
    );

    const configurationService = new ConfigurationService();
    const configuration =
      await configurationService.loadConformetryConfiguration(
        configurationPath,
      );

    expect(configuration.generators["demo"]).toStrictEqual({
      aliases: ["d"],
      description: "demo generator",
      hooks: {
        postGenerate: { name: "post-hook" },
        preGenerate: { name: "pre-hook" },
      },
      name: "demo",
      schemaPath: "schema.json",
      targetPathStrategy: "direct",
      templateDirectoryPath: "templates",
    });
  });

  it("loads a JSONC configuration file", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-jsonc-"),
    );
    const configurationPath = path.join(workingDirectory, "conformetry.jsonc");
    await writeFile(
      configurationPath,
      `{
        // comment
        "generators": {
          "demo": {
            "name": "demo",
            "schemaPath": "schema.json",
            "targetPathStrategy": "direct",
            "templateDirectoryPath": "templates"
          }
        }
      }`,
      "utf8",
    );

    const configurationService = new ConfigurationService();
    const configuration =
      await configurationService.loadConformetryConfiguration(
        configurationPath,
      );

    expect(configuration.generators["demo"]?.name).toBe("demo");
  });

  it("resolves a workspace-relative configuration path from nested directories", async () => {
    const workspaceDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-workspace-"),
    );
    await writeFile(
      path.join(workspaceDirectory, "pnpm-workspace.yaml"),
      "{}\n",
    );
    await mkdir(path.join(workspaceDirectory, "configuration"), {
      recursive: true,
    });
    await mkdir(path.join(workspaceDirectory, "nested", "deep"), {
      recursive: true,
    });
    await writeFile(
      path.join(workspaceDirectory, "configuration", "conformetry.config.json"),
      JSON.stringify({
        generators: {
          demo: {
            name: "demo",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates",
          },
        },
      }),
      "utf8",
    );

    const previousWorkingDirectory = process.cwd();
    process.chdir(path.join(workspaceDirectory, "nested", "deep"));

    try {
      const configurationService = new ConfigurationService();
      const configuration =
        await configurationService.loadConformetryConfiguration(
          "configuration/conformetry.config.json",
        );

      expect(configuration.generators["demo"]?.schemaPath).toBe("schema.json");
    } finally {
      process.chdir(previousWorkingDirectory);
    }
  });

  it("treats invalid generator definitions as non-matching", () => {
    const configurationService = new ConfigurationService() as unknown as {
      isConformetryGeneratorDefinition(value: unknown): boolean;
    };

    expect(
      configurationService.isConformetryGeneratorDefinition(undefined),
    ).toBe(false);
    expect(configurationService.isConformetryGeneratorDefinition("demo")).toBe(
      false,
    );
    expect(
      configurationService.isConformetryGeneratorDefinition({
        name: "demo",
        schemaPath: "schema.json",
      }),
    ).toBe(false);
    expect(
      configurationService.isConformetryGeneratorDefinition({
        name: "demo",
        schemaPath: "schema.json",
        targetPathStrategy: "direct",
        templateDirectoryPath: "templates",
      }),
    ).toBe(true);
  });

  it("resolves to absolute path when workspace root cannot be discovered", async () => {
    const service = new ConfigurationService() as unknown as {
      resolveConfigurationPath(configurationPath: string): Promise<string>;
    };
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-no-workspace-"),
    );
    const previousWorkingDirectory = process.cwd();
    process.chdir(workingDirectory);

    try {
      const resolvedPath =
        await service.resolveConfigurationPath("missing.json");

      expect(resolvedPath).toBe(path.resolve("missing.json"));
    } finally {
      process.chdir(previousWorkingDirectory);
    }
  });

  it("returns an empty generator map when loaded JS config exports a non-object", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-js-export-"),
    );
    const configurationPath = path.join(
      workingDirectory,
      "conformetry.config.js",
    );
    await writeFile(configurationPath, "module.exports = 42;", "utf8");

    const configurationService = new ConfigurationService() as unknown as {
      loadConfigurationModule(
        pathName: string,
        extension: string,
      ): Promise<unknown>;
    };
    const configuration = await configurationService.loadConfigurationModule(
      configurationPath,
      ".js",
    );

    expect(configuration).toStrictEqual({ generators: {} });
  });

  it("loads a JS config when generators are exported directly without default", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-js-direct-"),
    );
    const configurationPath = path.join(
      workingDirectory,
      "conformetry.config.js",
    );
    await writeFile(
      configurationPath,
      `module.exports = {
        generators: {
          demo: {
            name: "demo",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates"
          }
        }
      };`,
      "utf8",
    );

    const configurationService = new ConfigurationService() as unknown as {
      loadConfigurationModule(
        pathName: string,
        extension: string,
      ): Promise<unknown>;
    };
    const configuration = await configurationService.loadConfigurationModule(
      configurationPath,
      ".js",
    );

    expect(configuration).toStrictEqual({
      generators: {
        demo: {
          name: "demo",
          schemaPath: "schema.json",
          targetPathStrategy: "direct",
          templateDirectoryPath: "templates",
        },
      },
    });
  });

  it("prefers object default export from JS-based configuration modules", async () => {
    const workingDirectory = await mkdtemp(
      path.join(tmpdir(), "conformetry-configuration-js-default-object-"),
    );
    const configurationPath = path.join(
      workingDirectory,
      "conformetry.config.mjs",
    );
    await writeFile(
      configurationPath,
      `export default {
        generators: {
          demo: {
            name: "demo",
            schemaPath: "schema.json",
            targetPathStrategy: "direct",
            templateDirectoryPath: "templates"
          }
        }
      };`,
      "utf8",
    );

    const configurationService = new ConfigurationService() as unknown as {
      loadConfigurationModule(
        pathName: string,
        extension: string,
      ): Promise<unknown>;
    };
    const configuration = await configurationService.loadConfigurationModule(
      configurationPath,
      ".mjs",
    );

    expect(configuration).toStrictEqual({
      generators: {
        demo: {
          name: "demo",
          schemaPath: "schema.json",
          targetPathStrategy: "direct",
          templateDirectoryPath: "templates",
        },
      },
    });
  });

  it("skips invalid generator entries returned from parser fallback behavior", async () => {
    const parseSpy = vi
      .spyOn(conformetryConfigurationSchema, "parse")
      .mockReturnValueOnce({
        generators: {
          invalid: { name: "only-name" },
        },
      } as never);

    try {
      const configurationService = new ConfigurationService();
      const configuration =
        await configurationService.loadConformetryConfiguration(
          "configuration/conformetry.config.ts",
        );

      expect(configuration).toStrictEqual({ generators: {} });
    } finally {
      parseSpy.mockRestore();
    }
  });
});
