import path from "node:path";

import { createMock } from "@golevelup/ts-vitest";
import { NestFactory } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { LoggerService } from "@codebase/logger";

import { MainModule } from "../../../testing/main.module";

import { NestjsProjectService } from "./nestjs-project.service";

import type { NestjsProject } from "./nestjs-project.types";
import type { INestApplicationContext } from "@nestjs/common";
import type { SpelunkedTree } from "nestjs-spelunker";

/** Paths the mocked workspace reports as existing. */
const existingPaths = new Set<string>();

/** Entries the mocked workspace reports beneath a directory, by basename. */
const workspaceEntries = new Map<string, string[]>();

/** Entry names the mocked workspace reports as files rather than directories. */
const workspaceFileEntries = new Set<string>();

/** Options the mocked explorer was given, in call order. */
const exploreOptions: { ignoreImports?: RegExp[] }[] = [];

/** Tree the mocked explorer returns. */
let exploredTree: SpelunkedTree[] = [];

/** Root modules the mocked container was built from, in call order. */
const exploredRootModules: unknown[] = [];

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

/** Builds a project graph node with the given tags. */
/** One discovered project, as `codependix-nx` hands it over. */
function buildTaggedProject(
  name: string,
  tags: string[],
): { absoluteRoot: string; name: string; tags: string[] } {
  return { absoluteRoot: `/workspace/packages/${name}`, name, tags };
}

describe(NestjsProjectService, () => {
  let logger: LoggerService;
  let service: NestjsProjectService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsProjectService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    logger = await module.resolve(LoggerService);
    service = await module.resolve(NestjsProjectService);
  });

  beforeEach(() => {
    existingPaths.clear();
    workspaceEntries.clear();
    workspaceFileEntries.clear();
    exploreOptions.length = 0;
    exploredTree = [];
    exploredRootModules.length = 0;
    vi.clearAllMocks();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("sets logger context", async () => {
    const module = await Test.createTestingModule({
      providers: [
        NestjsProjectService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
      ],
    }).compile();

    const localLogger = await module.resolve(LoggerService);

    expect(localLogger.setContext).toHaveBeenCalledWith("NestjsProjectService");
  });

  describe("isNestjsProject", () => {
    it("reports true when a project's tags include framework:nestjs", () => {
      expect(
        service.isNestjsProject(
          buildTaggedProject("caelundas", ["framework:nestjs"]),
        ),
      ).toBe(true);
    });

    it("reports false when a project's tags do not include framework:nestjs", () => {
      expect(
        service.isNestjsProject(
          buildTaggedProject("lexico", ["framework:react"]),
        ),
      ).toBe(false);
    });

    it("reports false for a project carrying no tags at all", () => {
      expect(service.isNestjsProject(buildTaggedProject("unknown", []))).toBe(
        false,
      );
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

  describe("discoverProjects", () => {
    it("keeps only the projects tagged framework:nestjs", () => {
      const discovered = service.discoverProjects([
        {
          absoluteRoot: "/workspace/applications/caelundas",
          name: "caelundas",
          tags: ["framework:nestjs"],
        },
        {
          absoluteRoot: "/workspace/applications/lexico",
          name: "lexico",
          tags: ["framework:react"],
        },
      ]);

      expect(discovered.map((project) => project.name)).toStrictEqual([
        "caelundas",
      ]);
    });

    it("describes each discovered project", () => {
      const discovered = service.discoverProjects([
        {
          absoluteRoot: "/workspace/packages/logger",
          name: "logger",
          tags: ["framework:nestjs"],
        },
      ]);

      expect(discovered).toStrictEqual([
        {
          absoluteRoot: "/workspace/packages/logger",
          name: "logger",
          rootModuleFile: undefined,
        },
      ]);
    });
  });

  describe("exploreProject", () => {
    /** Points at this project so the dynamic import resolves. */
    function buildProject(rootModuleFile: string | undefined): NestjsProject {
      return {
        absoluteRoot: process.cwd(),
        name: "codependix-nestjs",
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

      const tree = await service.exploreProject(
        buildProject("testing/main.module.ts"),
      );

      expect(tree).toStrictEqual(exploredTree);
      expect(exploredRootModules[0]).toBe(MainModule);
      expect(exploredRootModules[0]).toHaveProperty("name", "MainModule");
    });

    it("logs before closing the project's container", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("testing/main.module.ts"));

      expect(logger.debug).toHaveBeenCalledWith(
        "🚀 Booted a project's container",
        undefined,
        { project: "codependix-nestjs" },
      );
    });

    it("builds the container in preview mode so nothing is instantiated", async () => {
      mockApplicationContext();

      await service.exploreProject(buildProject("testing/main.module.ts"));

      expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ preview: true }),
      );
    });

    it("rejects a root module file that exports no MainModule", async () => {
      mockApplicationContext();

      await expect(
        service.exploreProject(
          buildProject("src/modules/module-graph/module-graph.module.ts"),
        ),
      ).rejects.toThrow("MainModule");
    });

    /**
     * Mirrors this project's own `module-graph` module folder so the module
     * files the walk finds are real, and the dynamic import that follows
     * resolves.
     */
    function mockPackageTree(): void {
      existingPaths.add(path.join(process.cwd(), "src"));
      existingPaths.add(path.join(process.cwd(), "src/modules"));
      existingPaths.add(path.join(process.cwd(), "src/modules/module-graph"));
      workspaceEntries.set("src", ["modules"]);
      workspaceEntries.set("modules", ["module-graph"]);
      workspaceEntries.set("module-graph", [
        "module-graph.service.ts",
        "module-graph.module.ts",
      ]);
      workspaceFileEntries.add("module-graph.service.ts");
      workspaceFileEntries.add("module-graph.module.ts");
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
        "ModuleGraphModule",
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

      await service.exploreProject(buildProject("testing/main.module.ts"));

      expect(
        exploreOptions[0]?.ignoreImports?.map((pattern) => pattern.source),
      ).not.toContain("^ConfigModule$");
    });
  });
});
