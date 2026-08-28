import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { UnknownConfigurationFileTypeError } from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

import type { ConformetryConfiguration } from "./configuration.types";

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

  it("keeps a generator's declared threshold", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example", threshold: 0.9 },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.threshold).toBe(0.9);
  });

  it("keeps an instance group's declared threshold", async () => {
    const configurationPath = await writeConfiguration([
      {
        instances: [{ patterns: ["src/modules/*"], threshold: 0.75 }],
        name: "example",
        templatePath: "templates/example",
      },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration[0]?.instances[0]?.threshold).toBe(0.75);
  });

  it("leaves an undeclared threshold unset rather than defaulting it", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example" },
    ]);

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    // Stamping every generator with 1 here would make the generator level
    // always beat a run-level `--threshold`, leaving that flag inert.
    expect(configuration[0]?.threshold).toBeUndefined();
  });

  it("rejects a threshold outside the 0-to-1 range", async () => {
    const configurationPath = await writeConfiguration([
      { name: "example", templatePath: "templates/example", threshold: 90 },
    ]);

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow(/threshold/i);
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

  it("unwraps a default export that is itself nested one level deeper", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.mjs");

    // Mirrors a CommonJS/ESM interop shape where the resolved default export
    // is itself an object carrying a further `default` field.
    await writeFile(
      configurationPath,
      'export default { default: [{ name: "example", templatePath: "templates/example" }] };\n',
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

  describe("refusals", () => {
    /** Writes a config and returns the promise of loading it. */
    async function load(
      definitions: unknown[],
    ): Promise<ConformetryConfiguration> {
      const configurationPath = path.join(
        await mkdtemp(path.join(tmpdir(), "conformetry-collision-")),
        "conformetry.config.json",
      );

      await writeFile(configurationPath, JSON.stringify(definitions), "utf8");

      return service.loadConformetryConfiguration(configurationPath);
    }

    it.each([
      [
        "two generators of the same name",
        [
          { name: "widget", templatePath: "t/1" },
          { name: "widget", templatePath: "t/2" },
        ],
        "name of more than one generator",
      ],
      [
        "a template shared by two generators",
        [
          { name: "widget", templatePath: "t/1" },
          { name: "gadget", templatePath: "t/1" },
        ],
        "template of more than one generator",
      ],
      [
        "a name that would escape the emitted plugin",
        [{ name: "../escape", templatePath: "t/1" }],
        "cannot contain a path separator",
      ],
      [
        "a generator named after the all-templates sentinel",
        [{ name: "all", templatePath: "t/1" }],
        "reserved: `validate --templates all`",
      ],
    ])("refuses %s", async (_description, definitions, message) => {
      // A host resolves the first match, so a collision shadows silently
      // rather than erroring where it is used.
      await expect(load(definitions)).rejects.toThrow(message);
    });

    it("refuses a generator declaring a field the schema does not know", async () => {
      // Generator aliases were removed outright. The schema is strict so a
      // workspace still declaring one is told, rather than having the key
      // stripped and believing it still resolves.
      await expect(
        load([{ aliases: ["w"], name: "widget", templatePath: "t/1" }]),
      ).rejects.toThrow("aliases");
    });
  });
});
