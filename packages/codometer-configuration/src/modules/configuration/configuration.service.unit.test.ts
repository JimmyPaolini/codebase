import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";
import { ConfigurationService } from "./configuration.service";

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  return writeConfigurationFile(
    "codometer.config.json",
    JSON.stringify(configuration),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codometer-config-"));
  const configurationPath = path.join(directory, fileName);

  await writeFile(configurationPath, contents, "utf8");

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

  it("falls back to defaults when no configuration file exists", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-empty-"),
    );

    const configuration = await service.loadConfiguration({ searchDirectory });

    expect(configuration.exclude).toStrictEqual([...DEFAULT_EXCLUDE_GLOBS]);
    expect(configuration.output.json).toBeUndefined();
    expect(configuration.output.markdown).toBeUndefined();
    expect(configuration.python.command).toBe(DEFAULT_PYTHON_COMMAND);
  });

  it("discovers a configuration file in the search directory", async () => {
    const configurationPath = await writeConfiguration({
      python: { command: "poetry run python" },
    });

    const configuration = await service.loadConfiguration({
      searchDirectory: path.dirname(configurationPath),
    });

    expect(configuration.python.command).toBe("poetry run python");
  });

  it("appends configured exclusions to the defaults", async () => {
    const configurationPath = await writeConfiguration({
      exclude: ["notepads/**", "**/dist/**"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toStrictEqual([
      ...DEFAULT_EXCLUDE_GLOBS,
      "notepads/**",
    ]);
  });

  it("carries configured ignore files through untouched", async () => {
    const configurationPath = await writeConfiguration({
      excludeFrom: [".prettierignore", ".codometerignore"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    // Not merged with defaults the way `exclude` is: naming an ignore file is
    // naming a file, and there is no default one to keep.
    expect(configuration.excludeFrom).toStrictEqual([
      ".prettierignore",
      ".codometerignore",
    ]);
  });

  it("defaults the ignore file list to empty", () => {
    expect(service.resolveConfiguration({}).excludeFrom).toStrictEqual([]);
  });

  it("defaults the markdown markers and the JSON indentation", async () => {
    const configurationPath = await writeConfiguration({
      output: {
        json: { path: "output/codometer.json" },
        markdown: { path: "README.md" },
      },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.output.json).toStrictEqual({
      indentation: DEFAULT_JSON_INDENTATION,
      path: "output/codometer.json",
    });
    expect(configuration.output.markdown).toStrictEqual({
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      path: "README.md",
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      write: undefined,
    });
  });

  it("keeps configured markers and indentation", async () => {
    const configurationPath = await writeConfiguration({
      output: {
        json: { indentation: 4, path: "statistics.json" },
        markdown: {
          endMarker: "<!-- end -->",
          path: "docs/metrics.md",
          startMarker: "<!-- start -->",
        },
      },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.output.json?.indentation).toBe(4);
    expect(configuration.output.markdown?.startMarker).toBe("<!-- start -->");
    expect(configuration.output.markdown?.endMarker).toBe("<!-- end -->");
  });

  it("keeps a configured description", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { description: "Measured on push.", path: "R.md" } },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.output.markdown?.description).toBe(
      "Measured on push.",
    );
  });

  it("carries the render and write callbacks through unchanged", () => {
    const render = (): string => "rendered";
    const write = (): boolean => true;

    const configuration = service.resolveConfiguration({
      output: { markdown: { path: "README.md", render, write } },
    });

    expect(configuration.output.markdown?.render).toBe(render);
    expect(configuration.output.markdown?.write).toBe(write);
  });

  it("leaves the callbacks unset when the configuration supplies none", () => {
    const configuration = service.resolveConfiguration({
      output: { markdown: { path: "README.md" } },
    });

    expect(configuration.output.markdown?.render).toBeUndefined();
    expect(configuration.output.markdown?.write).toBeUndefined();
  });

  it("accepts markdown output that only names a write function", () => {
    const configuration = service.resolveConfiguration({
      output: { markdown: { write: () => true } },
    });

    expect(configuration.output.markdown?.path).toBeUndefined();
    expect(configuration.output.markdown?.write).toBeDefined();
  });

  it("rejects markdown output naming neither a path nor a writer", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { description: "Nowhere to write this." } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a render option that is not a function", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { path: "README.md", render: "not a function" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("reads a JSONC configuration with comments", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.jsonc",
      `{
        // Scratch notes are prose, not source.
        "exclude": ["notepads/**"]
      }`,
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toContain("notepads/**");
  });

  it("reads a TypeScript configuration's default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.ts",
      `interface Configuration {
        output: { markdown: { path: string } };
      }

      const configuration: Configuration = {
        output: { markdown: { path: "README.md" } },
      };

      export default configuration;
      `,
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.output.markdown?.path).toBe("README.md");
  });

  it("unwraps a CommonJS module's nested default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      'module.exports = { default: { python: { command: "python3.13" } } };',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.python.command).toBe("python3.13");
  });

  it("searches the process cwd when no directory is given", async () => {
    const configurationPath = await writeConfiguration({
      python: { command: "cwd python" },
    });
    const cwdSpy = vi
      .spyOn(process, "cwd")
      .mockReturnValue(path.dirname(configurationPath));

    const configuration = await service.loadConfiguration();

    expect(configuration.python.command).toBe("cwd python");

    cwdSpy.mockRestore();
  });

  it("falls back to defaults when the module exports no object", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.ts",
      "export default 42;",
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.exclude).toStrictEqual([...DEFAULT_EXCLUDE_GLOBS]);
  });

  it("rejects a malformed configuration", async () => {
    const configurationPath = await writeConfiguration({ exclude: "notepads" });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("throws a typed error for an unsupported extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.yaml",
      "exclude: []",
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(UnknownConfigurationFileTypeError);
  });

  it("throws a typed error for a configuration path that does not exist", async () => {
    await expect(
      service.loadConfiguration({
        configurationPath: "configuration/missing.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
  });

  it("throws when no repository root holds the relative path either", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "codometer-rootless-"),
    );
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

    await expect(
      service.loadConfiguration({
        configurationPath: "configuration/codometer.config.ts",
      }),
    ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

    cwdSpy.mockRestore();
  });

  it("resolves a configuration path relative to the repository root", async () => {
    const configuration = await service.loadConfiguration({
      configurationPath: "configuration/codometer.config.ts",
    });

    expect(configuration.output.markdown?.path).toBe("README.md");
  });
});
