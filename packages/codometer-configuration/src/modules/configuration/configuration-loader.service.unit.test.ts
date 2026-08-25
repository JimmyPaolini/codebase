import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ConfigurationLoaderService } from "./configuration-loader.service";
import { UnknownConfigurationFileTypeError } from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codometer-loader-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

  return configurationPath;
}

describe(ConfigurationLoaderService, () => {
  let service: ConfigurationLoaderService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ConfigurationLoaderService],
    }).compile();

    service = await module.resolve(ConfigurationLoaderService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("finds nothing in a directory with no configuration file", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-empty-"),
    );

    await expect(service.load({ searchDirectory })).resolves.toBeUndefined();
  });

  it("loads a JSON configuration file", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.json",
      JSON.stringify({ defaultTarget: "codebase" }),
    );

    const loaded = await service.load({ configurationPath });

    expect(loaded).toStrictEqual({
      configuration: { defaultTarget: "codebase" },
    });
  });

  it("loads a JSONC configuration file, comments and all", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.jsonc",
      `{
        // a comment JSON.parse would reject
        "defaultTarget": "codebase",
      }`,
    );

    const loaded = await service.load({ configurationPath });

    expect(loaded).toStrictEqual({
      configuration: { defaultTarget: "codebase" },
    });
  });

  it("calls a configuration exported as a function with its run context", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      `module.exports = (context) => ({
        exclude: [context.configurationDirectory, context.directory],
      });`,
    );
    const configurationDirectory = path.dirname(configurationPath);
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-searched-"),
    );

    const loaded = await service.load({ configurationPath, searchDirectory });

    expect(loaded?.configuration).toStrictEqual({
      exclude: [configurationDirectory, searchDirectory],
    });
  });

  it("throws a typed error for an unsupported configuration file extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.txt",
      "",
    );

    await expect(service.load({ configurationPath })).rejects.toBeInstanceOf(
      UnknownConfigurationFileTypeError,
    );
  });

  it("throws a typed error for a configuration path that does not exist", async () => {
    await expect(
      service.load({
        configurationPath: "configuration/missing.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
  });

  it("throws when no repository root holds the relative path either", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-rootless-"),
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

    await expect(
      service.load({
        configurationPath: "configuration/codometer.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

    cwdSpy.mockRestore();
  });

  it("resolves a configuration path relative to the repository root", async () => {
    // This repository's own configuration file, found by climbing from the
    // process cwd — which a test run leaves at the repository root — up to
    // the marker `findRepositoryRoot` looks for.
    const loaded = await service.load({
      configurationPath: "configuration/codometer.config.ts",
    });

    expect(loaded).toBeDefined();
  });

  it("reads a factory's default export through interop", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.mjs",
      `export default (context) => ({ exclude: [context.directory] });`,
    );
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-loader-searched-"),
    );

    const loaded = await service.load({ configurationPath, searchDirectory });

    expect(loaded?.configuration).toStrictEqual({ exclude: [searchDirectory] });
  });

  it("finds a configuration file by walking up from a nested directory", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.json",
      JSON.stringify({ defaultTarget: "codebase" }),
    );
    const rootDirectory = path.dirname(configurationPath);
    const nestedDirectory = path.join(rootDirectory, "packages", "project");
    await mkdir(nestedDirectory, { recursive: true });

    const loaded = await service.load({ searchDirectory: nestedDirectory });

    expect(loaded).toStrictEqual({
      configuration: { defaultTarget: "codebase" },
    });
  });
});
