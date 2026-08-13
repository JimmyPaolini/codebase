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
});
