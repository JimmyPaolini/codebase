import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import {
  codependixConfigurationSchema,
  DEFAULT_INCLUDE_GLOBS,
} from "./configuration.constants";
import { ConfigurationFileNotFoundError } from "./configuration.errors";
import { ConfigurationService } from "./configuration.service";

import type { CodependixBoundaryRule } from "./configuration.types";

/** Writes a JSON configuration holding whatever the caller passes. */
async function writeConfiguration(configuration: unknown): Promise<string> {
  return writeConfigurationFile(
    "codependix.config.json",
    JSON.stringify(configuration),
  );
}

/** Writes a configuration file of the given name into a fresh temp directory. */
async function writeConfigurationFile(
  fileName: string,
  contents: string,
): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "codependix-config-"));
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

  describe("loading", () => {
    it("falls back to defaults when no configuration file exists", async () => {
      const searchDirectory = await mkdtemp(
        path.join(tmpdir(), "codependix-empty-"),
      );

      const configuration = await service.loadConfiguration({
        searchDirectory,
      });

      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
      expect(configuration.exclude).toStrictEqual([]);
      expect(configuration.defaults).toStrictEqual({});
      expect(configuration.projects).toStrictEqual({});
    });

    it("discovers a configuration file in the search directory", async () => {
      const configurationPath = await writeConfiguration({
        exclude: ["scratch-*"],
      });

      const configuration = await service.loadConfiguration({
        searchDirectory: path.dirname(configurationPath),
      });

      expect(configuration.exclude).toStrictEqual(["scratch-*"]);
    });

    it("reads a TypeScript configuration's default export", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.ts",
        `interface Configuration { include: string[] }
        const configuration: Configuration = { include: ["packages/*"] };
        export default configuration;
        `,
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual(["packages/*"]);
    });

    it("unwraps a CommonJS module's nested default export", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.cjs",
        'module.exports = { default: { include: ["packages/*"] } };',
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual(["packages/*"]);
    });

    it("searches the process cwd when no directory is given", async () => {
      const configurationPath = await writeConfiguration({
        include: ["packages/from-cwd"],
      });
      const cwdSpy = vi
        .spyOn(process, "cwd")
        .mockReturnValue(path.dirname(configurationPath));

      const configuration = await service.loadConfiguration();

      expect(configuration.include).toStrictEqual(["packages/from-cwd"]);

      cwdSpy.mockRestore();
    });

    it("falls back to defaults when the module exports no object", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.ts",
        "export default 42;",
      );

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
    });

    it("rejects a malformed configuration", async () => {
      const configurationPath = await writeConfiguration({
        include: "not-an-array",
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("throws a typed error for an unsupported extension", async () => {
      const configurationPath = await writeConfigurationFile(
        "codependix.config.yaml",
        "include: []",
      );

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toThrow(/Unsupported configuration file type/);
    });

    it("throws a typed error for a configuration path that does not exist", async () => {
      await expect(
        service.loadConfiguration({
          configurationPath: "configuration/missing.config.ts",
        }),
      ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);
    });

    it("throws when no workspace root holds the relative path either", async () => {
      const searchDirectory = await mkdtemp(
        path.join(tmpdir(), "codependix-rootless-"),
      );
      const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(searchDirectory);

      await expect(
        service.loadConfiguration({
          configurationPath: "configuration/codependix.config.ts",
        }),
      ).rejects.toBeInstanceOf(ConfigurationFileNotFoundError);

      cwdSpy.mockRestore();
    });

    it("resolves a configuration path relative to the workspace root", async () => {
      const configuration = await service.loadConfiguration({
        configurationPath: "packages/codependix-configuration/package.json",
      });

      // package.json parses as JSON and validates as an (empty) configuration.
      expect(configuration.include).toStrictEqual([...DEFAULT_INCLUDE_GLOBS]);
    });

    it("rejects a graph output naming a json target with no json destination", async () => {
      const configurationPath = await writeConfiguration({
        defaults: { nx: { target: "json" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a graph output naming a markdown target with no markdown destination", async () => {
      const configurationPath = await writeConfiguration({
        defaults: { nx: { target: "markdown" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a both target missing either destination", async () => {
      const configurationPath = await writeConfiguration({
        defaults: {
          nx: { json: { path: "codependix-nx.json" }, target: "both" },
        },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("rejects a markdown destination naming neither an anchor nor a path", async () => {
      const configurationPath = await writeConfiguration({
        defaults: { nx: { markdown: {}, target: "markdown" } },
      });

      await expect(
        service.loadConfiguration({ configurationPath }),
      ).rejects.toBeInstanceOf(ZodError);
    });

    it("accepts a fully configured graph output", async () => {
      const configurationPath = await writeConfiguration({
        defaults: {
          nx: {
            json: { path: "codependix-nx.json" },
            markdown: { anchor: "codependix-nx" },
            target: "both",
          },
        },
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(configuration.defaults.nx?.target).toBe("both");
    });
  });

  describe("boundaries", () => {
    it("resolves every level to an empty list when none is declared", () => {
      expect(service.resolveConfiguration({}).boundaries).toStrictEqual({
        imports: [],
        nestjs: [],
        nx: [],
        pythonImports: [],
      });
    });

    it("keeps the rules a level declares", () => {
      const rule: CodependixBoundaryRule = {
        from: { tags: ["type:application"] },
        kind: "forbid",
        name: "applications-are-leaves",
        to: { tags: ["type:application"] },
      };

      expect(
        service.resolveConfiguration({ boundaries: { nx: [rule] } }).boundaries,
      ).toStrictEqual({
        imports: [],
        nestjs: [],
        nx: [rule],
        pythonImports: [],
      });
    });

    it("accepts an access rule and an acyclic rule at the same level", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          imports: [
            {
              from: { path: ["**/*.types.ts"] },
              kind: "forbid",
              message: "Types are the leaf of a module.",
              name: "types-files-do-not-reach-services",
              to: { path: ["**/*.service.ts"] },
            },
            { kind: "acyclic", name: "no-cycles", nodes: { path: ["src/**"] } },
          ],
        },
      });

      expect(parsed.success).toBe(true);
    });

    it("refuses a selector naming no field at all", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          nx: [{ from: {}, kind: "forbid", name: "empty", to: { id: ["a"] } }],
        },
      });

      expect(parsed.success).toBe(false);
    });

    it("refuses a rule kind it does not know", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: {
          nx: [
            { from: { id: ["a"] }, kind: "warn", name: "x", to: { id: ["b"] } },
          ],
        },
      });

      expect(parsed.success).toBe(false);
    });

    it("refuses a rule with no name", () => {
      const parsed = codependixConfigurationSchema.safeParse({
        boundaries: { nx: [{ kind: "acyclic", name: "" }] },
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("resolveForProject", () => {
    it("resolves to none when nothing configures the graph type", () => {
      const configuration = service.resolveConfiguration({});

      expect(
        service.resolveForProject({
          configuration,
          graphType: "nx",
          projectName: "codependix-nx",
        }),
      ).toStrictEqual({ json: undefined, markdown: undefined, target: "none" });
    });

    it("falls back to the global default for a project naming no override", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "codependix-nx",
      });

      expect(resolved).toStrictEqual({
        json: undefined,
        markdown: { anchor: "nx", path: "README.md" },
        target: "markdown",
      });
    });

    it("lets a project's own override replace the default outright", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
        projects: {
          "codependix-nx": {
            nx: { json: { path: "graph.json" }, target: "json" },
          },
        },
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "codependix-nx",
      });

      expect(resolved).toStrictEqual({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });
    });

    it("defaults an anchor destination's markdown path to README.md", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "any-project",
      });

      expect(resolved.markdown?.path).toBe("README.md");
    });

    it("keeps a standalone markdown path a project names for itself", () => {
      const configuration = service.resolveConfiguration({
        defaults: {
          nx: {
            markdown: { path: "docs/dependency-graph.md" },
            target: "markdown",
          },
        },
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "any-project",
      });

      expect(resolved.markdown).toStrictEqual({
        anchor: undefined,
        path: "docs/dependency-graph.md",
      });
    });

    it("excludes a project matching an exclude glob even with a default target", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
        exclude: ["excluded-*"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "excluded-project",
      });

      expect(resolved.target).toBe("none");
    });

    it("excludes a project matching no include glob", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
        include: ["packages/*"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "tools-something",
      });

      expect(resolved.target).toBe("none");
    });

    it("includes a project matching the configured include glob", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { markdown: { anchor: "nx" }, target: "markdown" } },
        include: ["packages/*"],
      });

      expect(
        service.isProjectIncluded("packages/codependix-nx", configuration),
      ).toBe(true);
    });

    it("includes a project whose root matches an include glob its name does not", () => {
      const configuration = service.resolveConfiguration({
        defaults: { nx: { target: "json" } },
        include: ["packages/*"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "codependix-nx",
        projectRoot: "packages/codependix-nx",
      });

      expect(resolved.target).not.toBe("none");
    });

    it("excludes a project whose root matches an exclude glob its name does not", () => {
      const configuration = service.resolveConfiguration({
        exclude: ["packages/excluded-*"],
      });

      const resolved = service.resolveForProject({
        configuration,
        graphType: "nx",
        projectName: "kept-name",
        projectRoot: "packages/excluded-project",
      });

      expect(resolved.target).toBe("none");
    });
  });

  describe("resolveForWorkspace", () => {
    it("resolves to none when the configuration names no workspace section", () => {
      const configuration = service.resolveConfiguration({});

      expect(service.resolveForWorkspace(configuration)).toStrictEqual({
        json: undefined,
        markdown: undefined,
        target: "none",
      });
    });

    it("reads the workspace section's nx export configuration", () => {
      const configuration = service.resolveConfiguration({
        workspace: {
          nx: {
            json: { path: "codependix-workspace-graph.json" },
            markdown: { anchor: "workspace" },
            target: "both",
          },
        },
      });

      expect(service.resolveForWorkspace(configuration)).toStrictEqual({
        json: { path: "codependix-workspace-graph.json" },
        markdown: { anchor: "workspace", path: "README.md" },
        target: "both",
      });
    });

    it("is unaffected by include and exclude globs", () => {
      const configuration = service.resolveConfiguration({
        exclude: ["**"],
        include: [],
        workspace: {
          nx: { markdown: { anchor: "workspace" }, target: "markdown" },
        },
      });

      expect(service.resolveForWorkspace(configuration).target).toBe(
        "markdown",
      );
    });

    it("resolves an explicit workspace configuration built without loading a file", async () => {
      const configurationPath = await writeConfiguration({
        workspace: { nx: { json: { path: "graph.json" }, target: "json" } },
      });

      const configuration = await service.loadConfiguration({
        configurationPath,
      });

      expect(service.resolveForWorkspace(configuration)).toStrictEqual({
        json: { path: "graph.json" },
        markdown: undefined,
        target: "json",
      });
    });
  });
});
