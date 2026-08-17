import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { NestFactory } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";
import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

import type { NestjsProject } from "./nestjs-module-graphs.types";
import type { INestApplicationContext } from "@nestjs/common";
import type { SpelunkedTree } from "nestjs-spelunker";

/** Files the mocked workspace holds, keyed by directory basename. */
const workspaceEntries = new Map<string, string[]>();

/** Entry names the mocked workspace reports as files rather than directories. */
const workspaceFileEntries = new Set<string>();

/** Paths the mocked workspace reports as existing. */
const existingPaths = new Set<string>();

/** Contents the mocked workspace returns for a read. */
const fileContents = new Map<string, string>();

/** Root modules the mocked container was built from, in call order. */
const exploredRootModules: unknown[] = [];

/** Options the mocked explorer was given, in call order. */
const exploreOptions: { ignoreImports?: RegExp[] }[] = [];

/** Tree the mocked explorer returns. */
let exploredTree: SpelunkedTree[] = [];

vi.mock("node:fs", async (importOriginal) => {
  const importedModule = await importOriginal();
  const module =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...module,
    existsSync: vi.fn<(target: string) => boolean>((target: string) =>
      existingPaths.has(target),
    ),
    readdirSync: vi.fn<
      (target: string) => { isDirectory: () => boolean; name: string }[]
    >((target: string) =>
      (workspaceEntries.get(path.basename(target)) ?? []).map((name) => ({
        isDirectory: () => !workspaceFileEntries.has(name),
        name,
      })),
    ),
    readFileSync: vi.fn<(target: string) => string>(
      (target: string) => fileContents.get(target) ?? "{}",
    ),
  };
});

vi.mock("nestjs-spelunker", () => ({
  SpelunkerModule: {
    explore: vi.fn<
      (application: unknown, options: { ignoreImports?: RegExp[] }) => unknown
    >((_application: unknown, options: { ignoreImports?: RegExp[] }) => {
      exploreOptions.push(options);
      return exploredTree;
    }),
  },
}));

describe(NestjsModuleGraphsService, () => {
  let service: NestjsModuleGraphsService;

  /** Registers a project directory with the given Nx tags. */
  function registerProject(options: {
    directory: string;
    name: string;
    tags: string[];
    withRootModule?: boolean;
  }): void {
    const { directory, name, tags, withRootModule = false } = options;
    const absoluteRoot = path.join("/workspace", directory, name);

    workspaceEntries.set(directory, [
      ...(workspaceEntries.get(directory) ?? []),
      name,
    ]);
    existingPaths.add(path.join("/workspace", directory));
    existingPaths.add(path.join(absoluteRoot, "project.json"));
    fileContents.set(
      path.join(absoluteRoot, "project.json"),
      JSON.stringify({ tags }),
    );

    if (withRootModule) {
      existingPaths.add(path.join(absoluteRoot, "src/main.module.ts"));
    }
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NestjsModuleGraphsGraphService, NestjsModuleGraphsService],
    }).compile();

    service = await module.resolve(NestjsModuleGraphsService);
  });

  beforeEach(() => {
    workspaceEntries.clear();
    workspaceFileEntries.clear();
    existingPaths.clear();
    fileContents.clear();
    exploredRootModules.length = 0;
    exploreOptions.length = 0;
    exploredTree = [];
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("discoverProjects", () => {
    it("finds every project tagged as a NestJS project", () => {
      registerProject({
        directory: "applications",
        name: "caelundas",
        tags: ["framework:nestjs"],
      });
      registerProject({
        directory: "packages",
        name: "logger",
        tags: ["framework:nestjs"],
      });
      registerProject({
        directory: "tools",
        name: "synchronization",
        tags: ["framework:nestjs"],
      });

      expect(
        service.discoverProjects("/workspace").map((project) => project.name),
      ).toStrictEqual(["caelundas", "logger", "synchronization"]);
    });

    it("skips a project without the NestJS tag", () => {
      registerProject({
        directory: "applications",
        name: "lexico",
        tags: ["framework:react"],
      });

      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("skips a directory entry with no project file", () => {
      workspaceEntries.set("packages", ["stray"]);
      existingPaths.add("/workspace/packages");

      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("skips an entry that is not a directory", () => {
      registerProject({
        directory: "packages",
        name: "README.md",
        tags: ["framework:nestjs"],
      });
      workspaceFileEntries.add("README.md");

      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("skips a workspace directory that does not exist", () => {
      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("sorts projects by name across workspace directories", () => {
      registerProject({
        directory: "applications",
        name: "zebra",
        tags: ["framework:nestjs"],
      });
      registerProject({
        directory: "packages",
        name: "alpha",
        tags: ["framework:nestjs"],
      });

      expect(
        service.discoverProjects("/workspace").map((project) => project.name),
      ).toStrictEqual(["alpha", "zebra"]);
    });
  });

  describe("describeProject", () => {
    it("records the root module file of a project that bootstraps one", () => {
      const absoluteRoot = "/workspace/applications/caelundas";
      existingPaths.add(path.join(absoluteRoot, "src/main.module.ts"));

      expect(service.describeProject(absoluteRoot, "caelundas")).toStrictEqual({
        absoluteRoot,
        name: "caelundas",
        rootModuleFile: path.join(absoluteRoot, "src/main.module.ts"),
      });
    });

    it("leaves the root module file undefined for a library package", () => {
      expect(
        service.describeProject("/workspace/packages/logger", "logger")
          .rootModuleFile,
      ).toBeUndefined();
    });
  });

  describe("exploreProject", () => {
    /** Points at this project so the dynamic import resolves. */
    function buildProject(rootModuleFile: string | undefined): NestjsProject {
      return {
        absoluteRoot: process.cwd(),
        name: "synchronization",
        rootModuleFile:
          rootModuleFile === undefined
            ? undefined
            : path.join(process.cwd(), rootModuleFile),
      };
    }

    /** Records the root module the container was asked to build. */
    function mockApplicationContext(): void {
      vi.spyOn(NestFactory, "createApplicationContext").mockImplementation(
        async (rootModule: unknown): Promise<INestApplicationContext> => {
          await Promise.resolve();
          exploredRootModules.push(rootModule);

          return createMock<INestApplicationContext>();
        },
      );
    }

    it("explores the root module a project exports", async () => {
      mockApplicationContext();
      exploredTree = [
        {
          controllers: [],
          exports: [],
          imports: [],
          name: "MainModule",
          providers: {},
        },
      ];

      const graph = await service.exploreProject(
        buildProject("src/main.module.ts"),
      );

      expect(graph.moduleNames).toStrictEqual(["MainModule"]);
      expect(exploredRootModules[0]).toHaveProperty("name", "MainModule");
    });

    it("builds the container in preview mode so nothing is instantiated", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("src/main.module.ts"));

      expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ preview: true }),
      );
    });

    it("rejects a root module file that exports no MainModule", async () => {
      mockApplicationContext();

      await expect(
        service.exploreProject(buildProject("src/constants.ts")),
      ).rejects.toThrow("MainModule");
    });

    /**
     * Mirrors this project's own tree so the module files the walk finds are
     * real, and the dynamic import that follows resolves.
     */
    function mockPackageTree(): void {
      existingPaths.add(path.join(process.cwd(), "src"));
      existingPaths.add(path.join(process.cwd(), "src/modules"));
      existingPaths.add(
        path.join(process.cwd(), "src/modules/nestjs-module-graphs"),
      );
      workspaceEntries.set("src", ["constants.ts", "modules"]);
      workspaceEntries.set("modules", ["nestjs-module-graphs"]);
      workspaceEntries.set("nestjs-module-graphs", [
        "nestjs-module-graphs.module.ts",
      ]);
      workspaceFileEntries.add("constants.ts");
      workspaceFileEntries.add("nestjs-module-graphs.module.ts");
    }

    it("roots a library package in a synthetic module built from its own", async () => {
      mockApplicationContext();
      mockPackageTree();

      await service.exploreProject(buildProject(undefined));

      expect(exploredRootModules[0]).toHaveProperty(
        "module.name",
        "SyntheticRootModule",
      );
    });

    it("imports every module the package defines into the synthetic root", async () => {
      mockApplicationContext();
      mockPackageTree();

      await service.exploreProject(buildProject(undefined));

      // The config scaffolding is imported first, then the package's own.
      expect(exploredRootModules[0]).toHaveProperty(
        "imports.1.name",
        "NestjsModuleGraphsModule",
      );
    });

    it("keeps the synthetic root's config scaffolding out of the graph", async () => {
      mockApplicationContext();
      existingPaths.add(path.join(process.cwd(), "src"));
      workspaceEntries.set("src", []);

      await service.exploreProject(buildProject(undefined));

      expect(
        exploreOptions[0]?.ignoreImports?.map((pattern) => pattern.source),
      ).toContain("^ConfigModule$");
    });

    it("finds no modules in a package with no source directory", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject(undefined));

      expect(exploredRootModules[0]).toHaveProperty(
        "module.name",
        "SyntheticRootModule",
      );
      expect(exploredRootModules[0]).not.toHaveProperty("imports.1");
    });

    it("leaves ConfigModule in the graph of a project that declares it", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("src/main.module.ts"));

      expect(
        exploreOptions[0]?.ignoreImports?.map((pattern) => pattern.source),
      ).not.toContain("^ConfigModule$");
    });
  });
});
