import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { UnknownConfigurationFileTypeError } from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

/** Writes a JSON config holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
  const configurationPath = path.join(directory, "conformetry.config.json");

  await writeFile(configurationPath, JSON.stringify(configuration), "utf8");

  return configurationPath;
}
/** Writes a TypeScript config whose default export is the given source. */
async function writeTypescriptConfiguration(source: string): Promise<string> {
  const directory = await mkdtemp(
    path.join(tmpdir(), "conformetry-config-ts-"),
  );
  const configurationPath = path.join(directory, "conformetry.config.ts");

  await writeFile(configurationPath, source, "utf8");

  return configurationPath;
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationService],
    }).compile();

    service = await module.resolve(ConfigurationService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("loads the workspace configuration", async () => {
    const configuration = await service.loadConformetryConfiguration(
      "configuration/conformetry.config.ts",
    );

    expect(configuration.map((generator) => generator.name)).toContain(
      "react-component",
    );
  });

  it("throws a typed error for an unsupported extension", async () => {
    await expect(
      service.loadConformetryConfiguration("configuration/nope.yaml"),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("keeps the configured template path", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "custom/templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.templatePath).toBe("custom/templates/example");
  });

  it("defaults inputs and instances to empty", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.inputs).toStrictEqual({});
    expect(configuration[0]?.instances).toStrictEqual([]);
  });

  it("keeps instance globs, substitutions, and tags", async () => {
    const configurationPath = await writeConfiguration([
      {
        instances: [
          {
            patterns: ["packages/*/src/modules/*"],
            substitutions: { type: "packages" },
            tags: ["type:package"],
          },
        ],
        name: "example",
        templatePath: "templates/example",
      },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.instances[0]).toStrictEqual({
      patterns: ["packages/*/src/modules/*"],
      substitutions: { type: "packages" },
      tags: ["type:package"],
    });
  });

  it("gives up on the workspace search outside any workspace", async () => {
    const originalCwd = process.cwd();
    const outside = await mkdtemp(path.join(tmpdir(), "conformetry-outside-"));

    process.chdir(outside);

    try {
      // Walks to the filesystem root without finding a workspace manifest.
      await expect(
        service.loadConformetryConfiguration("nowhere/conformetry.config.json"),
      ).rejects.toThrow("ENOENT");
    } finally {
      process.chdir(originalCwd);
    }
  });

  it("reads no generators from a module that exports nothing usable", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    await writeFile(configurationPath, "export default 42;\n", "utf8");

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).resolves.toStrictEqual([]);
  });

  it("reads a module whose default export holds the generators", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    await writeFile(
      configurationPath,
      'export default [{ name: "example", templatePath: "templates/example" }];\n',
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.name).toBe("example");
  });

  it("reads a JSONC configuration, comments and all", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.jsonc");

    await writeFile(
      configurationPath,
      '// the workspace generators\n[{ "name": "example", "templatePath": "t" }]\n',
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.templatePath).toBe("t");
  });

  it("rejects a generator missing its name rather than validating nothing", async () => {
    const configurationPath = await writeConfiguration([
      { templatePath: "templates/example" },
    ]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow("name");
  });

  it("rejects a generator missing its template path", async () => {
    const configurationPath = await writeConfiguration([{ name: "example" }]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow("templatePath");
  });

  describe("typeScript configuration files", () => {
    it("reads a configuration exported from a module", async () => {
      const configurationPath = await writeTypescriptConfiguration(
        `export default [
          {
            inputs: {},
            instances: [{ patterns: ["packages/*"] }],
            name: "widget",
            templatePath: "configuration/templates/widget",
          },
        ];
`,
      );

      const configuration =
        await service.loadConformetryConfiguration(configurationPath);

      expect(configuration[0]?.name).toBe("widget");
    });
  });
});
