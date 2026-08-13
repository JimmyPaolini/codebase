import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { UnknownConfigurationFileTypeError } from "./configuration.constants";
import { ConfigurationService } from "./configuration.service";

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

    expect(configuration.generators["react-component"]).toBeDefined();
  });

  it("throws a typed error for an unsupported extension", async () => {
    await expect(
      service.loadConformetryConfiguration("configuration/nope.yaml"),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("honors a configured templateDirectoryPath", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.json");

    await writeFile(
      configurationPath,
      JSON.stringify({
        generators: {
          example: {
            name: "example",
            templateDirectoryPath: "custom/templates/example",
          },
        },
      }),
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration.generators["example"]?.templateDirectoryPath).toBe(
      "custom/templates/example",
    );
  });

  it("derives templateDirectoryPath from the registry key when unset", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.json");

    await writeFile(
      configurationPath,
      JSON.stringify({ generators: { example: { name: "example" } } }),
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration.generators["example"]?.templateDirectoryPath).toBe(
      path.join("configuration", "conformetry-templates", "example"),
    );
  });

  it("defaults parameters to an empty record", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.json");

    await writeFile(
      configurationPath,
      JSON.stringify({ generators: { example: { name: "example" } } }),
      "utf8",
    );

    const configuration =
      await service.loadConformetryConfiguration(configurationPath);

    expect(configuration.generators["example"]?.parameters).toStrictEqual({});
  });

  it("rejects a malformed registry rather than validating nothing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "conformetry-config-"));
    const configurationPath = path.join(directory, "conformetry.config.json");

    await writeFile(
      configurationPath,
      JSON.stringify({ generators: { example: { missingName: true } } }),
      "utf8",
    );

    await expect(
      service.loadConformetryConfiguration(configurationPath),
    ).rejects.toThrow("invalid_type");
  });
});
