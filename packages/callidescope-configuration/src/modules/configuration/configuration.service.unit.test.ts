import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  DEFAULT_ALLOW_SPREAD_FOR,
  DEFAULT_CALLER_MAJORITY_RATIO,
  DEFAULT_DIRECT_SPREAD_THRESHOLD,
  DEFAULT_ENTRY_POINT_DECORATORS,
  DEFAULT_EXCLUDE_GLOBS,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_MARKDOWN_END_MARKER,
  DEFAULT_MARKDOWN_START_MARKER,
  DEFAULT_MAXIMUM_DEPTH,
  DEFAULT_MAXIMUM_IMPLEMENTATION_FAN_OUT,
  DEFAULT_MINIMUM_CALLERS,
  DEFAULT_PREVIEW_COUNT,
  DEFAULT_PROJECT_README_HEADING,
  DEFAULT_SPREAD_THRESHOLD,
  UnknownConfigurationFileTypeError,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";
import { ConfigurationService } from "./configuration.service";

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  return writeConfigurationFile(
    "callidescope.config.json",
    JSON.stringify(configuration),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "callidescope-config-"));
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

  // 🌱 Defaults

  it("falls back to defaults when no configuration file exists", async () => {
    const searchDirectory = await mkdtemp(
      path.join(tmpdir(), "callidescope-empty-"),
    );

    const configuration = await service.loadConfiguration({ searchDirectory });

    expect(configuration.exclude).toStrictEqual([...DEFAULT_EXCLUDE_GLOBS]);
    expect(configuration.excludeFrom).toStrictEqual([]);
    expect(configuration.ignoreCallees).toStrictEqual([]);
    expect(configuration.projects).toStrictEqual([]);
    expect(configuration.allowSpreadFor).toStrictEqual([
      ...DEFAULT_ALLOW_SPREAD_FOR,
    ]);
    expect(configuration.output.json).toBeUndefined();
    expect(configuration.output.markdown).toBeUndefined();
  });

  it("applies every limit default", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.limits).toStrictEqual({
      callerMajorityRatio: DEFAULT_CALLER_MAJORITY_RATIO,
      directSpreadThreshold: DEFAULT_DIRECT_SPREAD_THRESHOLD,
      maximumBreadth: undefined,
      maximumDepth: DEFAULT_MAXIMUM_DEPTH,
      maximumImplementationFanOut: DEFAULT_MAXIMUM_IMPLEMENTATION_FAN_OUT,
      minimumCallers: DEFAULT_MINIMUM_CALLERS,
      spreadThreshold: DEFAULT_SPREAD_THRESHOLD,
    });
  });

  it("leaves the breadth limit unset when no default exists for it", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.limits.maximumBreadth).toBeUndefined();
  });

  it("keeps an authored breadth limit", () => {
    const configuration = service.resolveConfiguration({
      limits: { maximumBreadth: 5 },
    });

    expect(configuration.limits.maximumBreadth).toBe(5);
  });

  it("rejects a breadth limit that is not a positive integer", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumBreadth: 0 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("applies every entry-point default", () => {
    const configuration = service.resolveConfiguration({});

    expect(configuration.entryPoints).toStrictEqual({
      decorators: [...DEFAULT_ENTRY_POINT_DECORATORS],
      includeExportedFunctions: true,
      includeOrphans: true,
      includeTests: false,
    });
  });

  // 🎛️ Overrides

  it("keeps an authored limit and defaults the rest", () => {
    const configuration = service.resolveConfiguration({
      limits: { maximumDepth: 12 },
    });

    expect(configuration.limits.maximumDepth).toBe(12);
    expect(configuration.limits.spreadThreshold).toBe(DEFAULT_SPREAD_THRESHOLD);
  });

  it("keeps authored callee-ignore globs", () => {
    const configuration = service.resolveConfiguration({
      ignoreCallees: ["LoggerService.*"],
    });

    expect(configuration.ignoreCallees).toStrictEqual(["LoggerService.*"]);
  });

  it("keeps authored entry-point rules, including disabling them", () => {
    const configuration = service.resolveConfiguration({
      entryPoints: {
        decorators: ["Get"],
        includeExportedFunctions: false,
        includeOrphans: false,
        includeTests: true,
      },
    });

    expect(configuration.entryPoints).toStrictEqual({
      decorators: ["Get"],
      includeExportedFunctions: false,
      includeOrphans: false,
      includeTests: true,
    });
  });

  it("adds authored exclusions to the defaults rather than replacing them", () => {
    const configuration = service.resolveConfiguration({
      exclude: ["**/fixtures/**"],
    });

    expect(configuration.exclude).toContain("**/fixtures/**");
    expect(configuration.exclude).toContain("**/node_modules/**");
  });

  it("does not duplicate an exclusion the defaults already hold", () => {
    const configuration = service.resolveConfiguration({
      exclude: ["**/dist/**"],
    });

    const occurrences = configuration.exclude.filter(
      (glob) => glob === "**/dist/**",
    );

    expect(occurrences).toHaveLength(1);
  });

  it("replaces the spread allowances rather than adding to them", () => {
    const configuration = service.resolveConfiguration({
      allowSpreadFor: ["**/*.resolver.ts"],
    });

    expect(configuration.allowSpreadFor).toStrictEqual(["**/*.resolver.ts"]);
  });

  // 📤 Output destinations

  it("defaults the JSON indentation when a path is named", () => {
    const configuration = service.resolveConfiguration({
      output: { json: { path: "output/callidescope.json" } },
    });

    expect(configuration.output.json).toStrictEqual({
      indentation: DEFAULT_JSON_INDENTATION,
      path: "output/callidescope.json",
    });
  });

  it("keeps an authored JSON indentation, zero included", () => {
    const configuration = service.resolveConfiguration({
      output: { json: { indentation: 0, path: "output/callidescope.json" } },
    });

    expect(configuration.output.json?.indentation).toBe(0);
  });

  it("defaults the markdown markers when a path is named", () => {
    const configuration = service.resolveConfiguration({
      output: { markdown: { path: "REPORT.md" } },
    });

    expect(configuration.output.markdown).toStrictEqual({
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      path: "REPORT.md",
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      write: undefined,
    });
  });

  it("keeps authored markdown markers, description, and callbacks", () => {
    const render = (): string => "rendered";
    const write = (): boolean => true;

    const configuration = service.resolveConfiguration({
      output: {
        markdown: {
          description: "Call stacks",
          endMarker: "<!-- END -->",
          path: "REPORT.md",
          render,
          startMarker: "<!-- START -->",
          write,
        },
      },
    });

    expect(configuration.output.markdown?.description).toBe("Call stacks");
    expect(configuration.output.markdown?.startMarker).toBe("<!-- START -->");
    expect(configuration.output.markdown?.endMarker).toBe("<!-- END -->");
    expect(configuration.output.markdown?.render).toBe(render);
    expect(configuration.output.markdown?.write).toBe(write);
  });

  it("leaves the diagram destination alone until it is asked for", () => {
    expect(
      service.resolveConfiguration({ output: {} }).output.mermaid,
    ).toBeUndefined();
  });

  it("defaults the diagram destination's markers when a path is named", () => {
    expect(
      service.resolveConfiguration({
        output: { mermaid: { path: "GRAPH.md" } },
      }).output.mermaid,
    ).toStrictEqual({
      description: undefined,
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      path: "GRAPH.md",
      render: undefined,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
      write: undefined,
    });
  });

  it("resolves the diagram and markdown destinations independently", () => {
    // Two destinations rather than one with a mode, so a repository can
    // publish the tree and the diagram from the same run.
    const configuration = service.resolveConfiguration({
      output: {
        markdown: { path: "REPORT.md" },
        mermaid: { endMarker: "<!-- END -->", path: "GRAPH.md" },
      },
    });

    expect(configuration.output.markdown?.path).toBe("REPORT.md");
    expect(configuration.output.markdown?.endMarker).toBe(
      DEFAULT_MARKDOWN_END_MARKER,
    );
    expect(configuration.output.mermaid?.path).toBe("GRAPH.md");
    expect(configuration.output.mermaid?.endMarker).toBe("<!-- END -->");
  });

  it.each(["json", "markdown", "mermaid"] as const)(
    "keeps %s as the printed format",
    (format) => {
      expect(
        service.resolveConfiguration({ output: { format } }).output.format,
      ).toBe(format);
    },
  );

  // 📚 Project READMEs

  it("leaves the project READMEs alone until they are asked for", () => {
    expect(
      service.resolveConfiguration({ output: {} }).output.projectReadmes,
    ).toBeUndefined();
  });

  it("defaults every part of an empty project README destination", () => {
    const configuration = service.resolveConfiguration({
      output: { projectReadmes: {} },
    });

    expect(configuration.output.projectReadmes).toStrictEqual({
      endMarker: DEFAULT_MARKDOWN_END_MARKER,
      heading: DEFAULT_PROJECT_README_HEADING,
      previewCount: DEFAULT_PREVIEW_COUNT,
      startMarker: DEFAULT_MARKDOWN_START_MARKER,
    });
  });

  it("keeps an authored heading, preview count, and markers", () => {
    const configuration = service.resolveConfiguration({
      output: {
        projectReadmes: {
          endMarker: "<!-- END -->",
          heading: "## Call stacks",
          previewCount: 10,
          startMarker: "<!-- START -->",
        },
      },
    });

    expect(configuration.output.projectReadmes).toStrictEqual({
      endMarker: "<!-- END -->",
      heading: "## Call stacks",
      previewCount: 10,
      startMarker: "<!-- START -->",
    });
  });

  // 📂 File discovery

  it("discovers a configuration file in the search directory", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 9 },
    });

    const configuration = await service.loadConfiguration({
      searchDirectory: path.dirname(configurationPath),
    });

    expect(configuration.limits.maximumDepth).toBe(9);
  });

  it("loads a configuration file named explicitly", async () => {
    const configurationPath = await writeConfiguration({
      projects: ["caelundas"],
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.projects).toStrictEqual(["caelundas"]);
  });

  it("loads a JSONC configuration, comments included", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.jsonc",
      '{\n  // the limit\n  "limits": { "maximumDepth": 4 }\n}',
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(4);
  });

  it("loads a TypeScript configuration through its default export", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.ts",
      "export default { limits: { maximumDepth: 3 } };\n",
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(3);
  });

  it("treats a module exporting no object as an empty configuration", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.ts",
      "export default 42;\n",
    );

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(DEFAULT_MAXIMUM_DEPTH);
  });

  // 🚨 Failures

  it("throws when an explicitly named configuration file is missing", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "callidescope-gone-"));

    await expect(
      service.loadConfiguration({
        configurationPath: path.join(directory, "callidescope.config.ts"),
      }),
    ).rejects.toThrow(ConfigurationFileNotFoundError);
  });

  // 🌳 Repository-root resolution
  //
  // A task runner sets the cwd to the project rather than the workspace, so a
  // path given relative to the repository root has to survive being resolved
  // from somewhere below it.

  it("resolves a path relative to the repository root", async () => {
    const repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-repository-"),
    );
    await writeFile(
      path.join(repositoryRoot, "pnpm-workspace.yaml"),
      "packages: []\n",
      "utf8",
    );
    const nestedDirectory = path.join(repositoryRoot, "packages", "nested");
    await mkdir(nestedDirectory, { recursive: true });
    await writeFile(
      path.join(repositoryRoot, "callidescope.config.json"),
      JSON.stringify({ limits: { maximumDepth: 11 } }),
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(nestedDirectory);

    try {
      const configuration = await service.loadConfiguration({
        configurationPath: "callidescope.config.json",
      });

      expect(configuration.limits.maximumDepth).toBe(11);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when the path is missing at the repository root too", async () => {
    const repositoryRoot = await mkdtemp(
      path.join(tmpdir(), "callidescope-repository-"),
    );
    await writeFile(
      path.join(repositoryRoot, "pnpm-workspace.yaml"),
      "packages: []\n",
      "utf8",
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(repositoryRoot);

    try {
      await expect(
        service.loadConfiguration({
          configurationPath: "callidescope.config.json",
        }),
      ).rejects.toThrow(ConfigurationFileNotFoundError);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when no repository root is found above the working directory", async () => {
    // A temp directory has no `.git` or `pnpm-workspace.yaml` anywhere above
    // it, so the upward walk reaches the filesystem root and gives up.
    const directory = await mkdtemp(
      path.join(tmpdir(), "callidescope-rootless-"),
    );

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(directory);

    try {
      await expect(
        service.loadConfiguration({
          configurationPath: "callidescope.config.json",
        }),
      ).rejects.toThrow(ConfigurationFileNotFoundError);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("throws when a configuration file has an unreadable extension", async () => {
    const configurationPath = await writeConfigurationFile(
      "callidescope.config.yaml",
      "limits:\n  maximumDepth: 6\n",
    );

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(UnknownConfigurationFileTypeError);
  });

  it("rejects a limit that is not a positive integer", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 0 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a caller majority ratio above one", async () => {
    const configurationPath = await writeConfiguration({
      limits: { callerMajorityRatio: 1.5 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a caller majority ratio of zero", async () => {
    const configurationPath = await writeConfiguration({
      limits: { callerMajorityRatio: 0 },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("accepts a caller majority ratio of exactly one", async () => {
    const configurationPath = await writeConfiguration({
      limits: { callerMajorityRatio: 1 },
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.callerMajorityRatio).toBe(1);
  });

  it("rejects a JSON output destination with no path", async () => {
    const configurationPath = await writeConfiguration({
      output: { json: { indentation: 2 } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a markdown output destination with no path", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { description: "no path" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects a non-function render callback", async () => {
    const configurationPath = await writeConfiguration({
      output: { markdown: { path: "REPORT.md", render: "not a function" } },
    });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("rejects an exclusion list holding a non-string", async () => {
    const configurationPath = await writeConfiguration({ exclude: [7] });

    await expect(
      service.loadConfiguration({ configurationPath }),
    ).rejects.toThrow(ZodError);
  });

  it("ignores a field it has no opinion about", async () => {
    const configurationPath = await writeConfiguration({
      limits: { maximumDepth: 5 },
      unknownFutureOption: true,
    });

    const configuration = await service.loadConfiguration({
      configurationPath,
    });

    expect(configuration.limits.maximumDepth).toBe(5);
  });
});
