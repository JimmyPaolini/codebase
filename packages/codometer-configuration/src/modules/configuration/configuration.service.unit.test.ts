import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  DEFAULT_CUSTOM_STATISTIC_COLORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_PYTHON_COMMAND,
  DEFAULT_TARGET_COMPRESSION,
  DEFAULT_TARGET_DIRECTORY,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";
import { ConfigurationService } from "./configuration.service";
import { InvalidLimitValueError } from "./limit-value.errors";

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

/**
 * Writes a configuration file, and returns a folder two levels beneath it.
 *
 * The nested folder is what an ancestor search has to climb out of, which is
 * the whole of what a project carrying no configuration file of its own does.
 */
async function writeConfigurationTree(
  fileName: string,
  contents: string,
): Promise<{ nestedDirectory: string; rootDirectory: string }> {
  const configurationPath = await writeConfigurationFile(fileName, contents);
  const rootDirectory = path.dirname(configurationPath);
  const nestedDirectory = path.join(rootDirectory, "packages", "project");

  await mkdir(nestedDirectory, { recursive: true });

  return { nestedDirectory, rootDirectory };
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

  it("gives every configured counter a color from the palette", async () => {
    const configurationPath = await writeConfiguration({
      statistics: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        { color: "ff0000", label: "Modules", patterns: ["**/*.module.ts"] },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.statistics).toStrictEqual([
      {
        color: DEFAULT_CUSTOM_STATISTIC_COLORS[0],
        group: "conventions",
        label: "Services",
        patterns: ["**/*.service.ts"],
        symbols: undefined,
      },
      {
        color: "ff0000",
        group: "conventions",
        label: "Modules",
        patterns: ["**/*.module.ts"],
        symbols: undefined,
      },
    ]);
  });

  // Colors run per group, so a counter added to one group cannot recolor the
  // badges of another and rewrite a report that had not otherwise changed.
  it("starts the palette over for each group", () => {
    const configuration = service.resolveConfiguration({
      statistics: [
        { label: "Services", patterns: ["**/*.service.ts"] },
        { label: "Modules", patterns: ["**/*.module.ts"] },
        {
          group: "typescript",
          label: "Classes",
          symbols: { kinds: ["class"] },
        },
      ],
    });

    expect(
      configuration.statistics.map((statistic) => statistic.color),
    ).toStrictEqual([
      DEFAULT_CUSTOM_STATISTIC_COLORS[0],
      DEFAULT_CUSTOM_STATISTIC_COLORS[1],
      DEFAULT_CUSTOM_STATISTIC_COLORS[0],
    ]);
  });

  it("keeps a symbol counter's matcher and defaults its patterns to none", () => {
    const configuration = service.resolveConfiguration({
      statistics: [
        {
          group: "typescript",
          label: "Static Methods",
          symbols: { kinds: ["method"], modifiers: ["static"] },
        },
      ],
    });

    expect(configuration.statistics[0]).toStrictEqual({
      color: DEFAULT_CUSTOM_STATISTIC_COLORS[0],
      group: "typescript",
      label: "Static Methods",
      patterns: [],
      symbols: { kinds: ["method"], modifiers: ["static"] },
    });
  });

  it("cycles the palette so every counter keeps a stable color", () => {
    const paletteLength = DEFAULT_CUSTOM_STATISTIC_COLORS.length;
    const configuration = service.resolveConfiguration({
      statistics: Array.from(
        { length: paletteLength + 1 },
        (_unused, index) => ({
          label: `counter ${index}`,
          patterns: ["**/*.ts"],
        }),
      ),
    });

    expect(configuration.statistics[paletteLength]?.color).toBe(
      DEFAULT_CUSTOM_STATISTIC_COLORS[0],
    );
  });

  it("defaults the counters to none", () => {
    expect(service.resolveConfiguration({}).statistics).toStrictEqual([]);
  });

  it("defaults the targets to none", () => {
    expect(service.resolveConfiguration({}).targets).toStrictEqual([]);
  });

  it("defaults a target's compression to gzip", () => {
    const [target] = service.resolveConfiguration({
      targets: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
      ],
    }).targets;

    expect(target).toStrictEqual({
      analyses: ["size"],
      compression: DEFAULT_TARGET_COMPRESSION,
      directory: DEFAULT_TARGET_DIRECTORY,
      exclude: [],
      include: ["dist/**/*.js"],
      name: "compiled",
    });
  });

  it("keeps a compression the target names for itself", () => {
    const [target] = service.resolveConfiguration({
      targets: [
        {
          analyses: ["size"],
          compression: "none",
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    }).targets;

    expect(target?.compression).toBe("none");
  });

  // Where a negation sits in the array is exactly what used to decide which
  // patterns it applied to, so it is collected rather than read in place.
  it.each([
    ["last", ["dist/**/*.js", "dist/extra/**/*.js", "!dist/**/*.map.js"]],
    ["first", ["!dist/**/*.map.js", "dist/**/*.js", "dist/extra/**/*.js"]],
    ["between", ["dist/**/*.js", "!dist/**/*.map.js", "dist/extra/**/*.js"]],
  ])("collects a negation written %s into the exclusions", (_, include) => {
    const [target] = service.resolveConfiguration({
      targets: [{ analyses: ["size"], include, name: "compiled" }],
    }).targets;

    expect(target?.exclude).toStrictEqual(["dist/**/*.map.js"]);
    expect(target?.include.toSorted()).toStrictEqual([
      "dist/**/*.js",
      "dist/extra/**/*.js",
    ]);
  });

  it("keeps a negation out of the include globs and in the exclusions", () => {
    const [target] = service.resolveConfiguration({
      targets: [
        {
          analyses: ["language", "size"],
          exclude: ["dist/vendor/**"],
          include: ["dist/**/*.js", "!dist/**/*.map.js"],
          name: "compiled",
        },
      ],
    }).targets;

    expect(target?.include).toStrictEqual(["dist/**/*.js"]);
    expect(target?.exclude).toStrictEqual([
      "dist/**/*.map.js",
      "dist/vendor/**",
    ]);
  });

  // Every pattern removing files leaves no pattern that adds any, so the
  // target would hold nothing for good — and a limit on it could never breach.
  it("rejects a target whose include globs only ever remove files", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        {
          analyses: ["size"],
          include: ["!dist/**/*.map.js"],
          name: "compiled",
        },
      ],
    });

    // Zod serializes its issues into the error message, so the target's name
    // arrives quoted and escaped rather than as it was written.
    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(
      /Target .*compiled.* has no include glob that adds files/,
    );
  });

  it("rejects two targets sharing one name", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
        { analyses: ["size"], include: ["build/**/*.js"], name: "compiled" },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a target asking for an analysis nobody runs", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        {
          analyses: ["astrology"],
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  // A `!` in a list that only ever removes files has nothing to negate, and
  // silently matches no path at all rather than the one it names.
  it("rejects a negated exclude glob", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        {
          analyses: ["size"],
          exclude: ["!dist/**/*.map.js"],
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("reads the targets a configuration file declares", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        {
          analyses: ["size"],
          compression: "brotli",
          include: ["dist/**/*.js"],
          name: "compiled",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.targets).toStrictEqual([
      {
        analyses: ["size"],
        compression: "brotli",
        directory: DEFAULT_TARGET_DIRECTORY,
        exclude: [],
        include: ["dist/**/*.js"],
        name: "compiled",
      },
    ]);
  });

  it("defaults the limits and the default target to none", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.limits).toStrictEqual([]);
    expect(configuration.defaultTarget).toBeUndefined();
  });

  it("reads the default target a configuration file names", async () => {
    const configurationPath = await writeConfiguration({
      defaultTarget: "codebase",
      limits: [{ metric: "typescript.interfaces", value: 500 }],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.defaultTarget).toBe("codebase");
  });

  it("rejects a declared target called what the codebase is called", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "codebase" },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("defaults a limit's severity to failing and leaves its label unset", () => {
    const configuration = service.resolveConfiguration({
      limits: [{ metric: "codebase.linesOfCode", value: 100_000 }],
    });

    expect(configuration.limits).toStrictEqual([
      {
        label: undefined,
        metric: "codebase.linesOfCode",
        severity: "fail",
        value: 100_000,
      },
    ]);
  });

  it("keeps a limit's declared severity and label", () => {
    const configuration = service.resolveConfiguration({
      limits: [
        {
          label: "Compiled bundle",
          metric: "compiled.size",
          severity: "warn",
          value: 8000,
        },
      ],
    });

    expect(configuration.limits).toStrictEqual([
      {
        label: "Compiled bundle",
        metric: "compiled.size",
        severity: "warn",
        value: 8000,
      },
    ]);
  });

  // A warn short of a fail is how a repository watches a number approach the
  // one that would stop a change, so one metric may carry both.
  it("accepts two limits naming one metric", () => {
    const configuration = service.resolveConfiguration({
      limits: [
        { metric: "compiled.size", severity: "warn", value: "8 KB" },
        { metric: "compiled.size", value: "10 KB" },
      ],
    });

    expect(configuration.limits.map((limit) => limit.value)).toStrictEqual([
      8000, 10_000,
    ]);
  });

  it.each([
    ["512 b", 512],
    ["8 KB", 8000],
    ["8kb", 8000],
    ["8 kB", 8000],
    ["1 MB", 1_000_000],
    ["2 GB", 2_000_000_000],
    ["1 TB", 1_000_000_000_000],
    // Rounded, because 0.1 * 1000 is 100.00000000000001 in binary floating
    // point, and a limit nobody can state exactly is one nobody can compare.
    ["1.5 KB", 1500],
    ["0.1 KB", 100],
    // A string carrying no unit at all is the plain number, which is how a
    // limit on a count of interfaces or files is written.
    ["200", 200],
    ["  8 KB  ", 8000],
  ])("reads %s as %i", (value, expected) => {
    const configuration = service.resolveConfiguration({
      limits: [{ metric: "compiled.size", value }],
    });

    expect(configuration.limits[0]?.value).toBe(expected);
  });

  // Never coerced to zero, which is what the tool this replaces did before
  // failing every target holding a single byte.
  it.each([
    // The trailing `b` is what makes a unit a size.
    "8 K",
    "8 KiB",
    // Spells an inherited property of every object literal, and the only one
    // an all-lowercase unit can reach. Read from an object rather than a map
    // it would multiply the limit into NaN, which nothing ever exceeds.
    "8 constructor",
    "8 valueOf",
    "8 toString",
    "8 kilobytes",
    "KB",
    "",
    "eight",
    "-5",
    "8 KB gzipped",
    "1,000 KB",
    ">8 KB",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -1,
  ])("refuses to read %s as a limit", (value) => {
    expect(() =>
      service.resolveConfiguration({
        limits: [{ metric: "compiled.size", value }],
      }),
    ).toThrow(InvalidLimitValueError);
  });

  it("rejects a limit naming a severity nobody reports", async () => {
    const configurationPath = await writeConfiguration({
      limits: [{ metric: "compiled.size", severity: "shout", value: 8000 }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a limit naming no metric", async () => {
    const configurationPath = await writeConfiguration({
      limits: [{ metric: "", value: 8000 }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a counter with no patterns", async () => {
    const configurationPath = await writeConfiguration({
      statistics: [{ label: "Nothing", patterns: [] }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  // Neither matcher means a permanent zero, which is worth failing over
  // rather than rendering as though it had been measured.
  it("rejects a counter that matches neither files nor symbols", async () => {
    const configurationPath = await writeConfiguration({
      statistics: [{ label: "Nothing" }],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a counter naming a group that is never rendered", async () => {
    const configurationPath = await writeConfiguration({
      statistics: [
        { group: "notebooks", label: "Classes", patterns: ["**/*.ts"] },
      ],
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it("rejects a symbol matcher asking for an unknown declaration kind", async () => {
    const configurationPath = await writeConfiguration({
      statistics: [{ label: "Sigils", symbols: { kinds: ["sigil"] } }],
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

    // Asserted on a setting this repository's configuration states however it
    // is run: the file is a factory, and which folder it was pointed at is
    // what decides the rest of what it says.
    expect(configuration.python.command).toBe("uv run python");
  });

  it("calls a configuration exported as a function with the run context", async () => {
    const { nestedDirectory, rootDirectory } = await writeConfigurationTree(
      "codometer.config.cjs",
      `module.exports = (context) => ({
        exclude: [context.configurationDirectory, context.directory],
      });`,
    );

    const configuration = await service.loadConfiguration({
      searchDirectory: nestedDirectory,
    });

    expect(configuration.exclude).toContain(rootDirectory);
    expect(configuration.exclude).toContain(nestedDirectory);
  });

  it("unwraps a CommonJS module's nested default factory", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      'module.exports = { default: () => ({ python: { command: "nested python" } }) };',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.python.command).toBe("nested python");
  });

  it("awaits a configuration factory that answers with a promise", async () => {
    const configurationPath = await writeConfigurationFile(
      "codometer.config.cjs",
      'module.exports = async () => ({ python: { command: "awaited python" } });',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.python.command).toBe("awaited python");
  });

  it("measures a folder carrying no configuration through its nearest ancestor's", async () => {
    const { nestedDirectory } = await writeConfigurationTree(
      "codometer.config.json",
      JSON.stringify({ python: { command: "inherited python" } }),
    );

    const configuration = await service.loadConfiguration({
      searchDirectory: nestedDirectory,
    });

    expect(configuration.python.command).toBe("inherited python");
  });

  it("lets a folder's own configuration replace an inherited one outright", async () => {
    const { nestedDirectory } = await writeConfigurationTree(
      "codometer.config.json",
      JSON.stringify({
        exclude: ["ancestor/**"],
        python: { command: "ancestor python" },
      }),
    );

    await writeFile(
      path.join(nestedDirectory, "codometer.config.json"),
      JSON.stringify({ exclude: ["folder/**"] }),
      "utf8",
    );

    const configuration = await service.loadConfiguration({
      searchDirectory: nestedDirectory,
    });

    // Nothing of the ancestor's survives: a merged configuration would leave a
    // limit that never applied looking exactly like one that did.
    expect(configuration.exclude).toContain("folder/**");
    expect(configuration.exclude).not.toContain("ancestor/**");
    expect(configuration.python.command).toBe(DEFAULT_PYTHON_COMMAND);
  });

  it("defaults a target's directory to the measured one", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        { analyses: ["size"], include: ["dist/**/*.js"], name: "compiled" },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.targets[0]?.directory).toBe(DEFAULT_TARGET_DIRECTORY);
  });

  it("keeps the directory a target reaches its globs from", async () => {
    const configurationPath = await writeConfiguration({
      targets: [
        {
          analyses: ["size"],
          directory: "../..",
          include: ["dist/packages/logger/**/*.js"],
          name: "compiled",
        },
      ],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.targets[0]?.directory).toBe("../..");
  });
});
