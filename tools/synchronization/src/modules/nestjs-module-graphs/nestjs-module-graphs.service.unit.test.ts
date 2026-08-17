import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { NestjsModuleGraphsService } from "./nestjs-module-graphs.service";

import type {
  NestjsModuleGraph,
  NestjsProject,
} from "./nestjs-module-graphs.types";
import type { DebuggedTree } from "nestjs-spelunker";

/** Entry names the mocked workspace holds, keyed by workspace directory. */
const workspaceEntries = new Map<string, string[]>();

/** Entry names the mocked workspace reports as files rather than directories. */
const workspaceFileEntries = new Set<string>();

/** Project names whose root module file the mocked workspace holds. */
const projectsWithRootModule = new Set<string>();

/** Root modules the mocked spelunker was handed, in call order. */
const exploredModules: unknown[] = [];

/** Tree the mocked spelunker returns for the next exploration. */
let spelunkedTree: DebuggedTree[] = [];

vi.mock("node:fs", async (importOriginal) => {
  const importedModule = await importOriginal();
  const module =
    typeof importedModule === "object" && importedModule !== null
      ? importedModule
      : {};

  return {
    ...module,
    existsSync: vi.fn<(target: string) => boolean>((target: string) =>
      target.endsWith("main.module.ts")
        ? projectsWithRootModule.has(
            path.basename(path.dirname(path.dirname(target))),
          )
        : workspaceEntries.has(path.basename(target)),
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
    debug: vi.fn<(rootModule: unknown) => Promise<DebuggedTree[]>>(
      async (rootModule: unknown) => {
        await Promise.resolve();
        exploredModules.push(rootModule);
        return spelunkedTree;
      },
    ),
  },
}));

/** Builds a spelunked tree node with only the fields the graph reads. */
function buildTreeNode(name: string, imports: string[]): DebuggedTree {
  return { controllers: [], exports: [], imports, name, providers: [] };
}

describe(NestjsModuleGraphsService, () => {
  let service: NestjsModuleGraphsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NestjsModuleGraphsService],
    }).compile();

    service = await module.resolve(NestjsModuleGraphsService);
  });

  beforeEach(() => {
    workspaceEntries.clear();
    workspaceFileEntries.clear();
    projectsWithRootModule.clear();
    exploredModules.length = 0;
    spelunkedTree = [];
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildGraph", () => {
    it("collects every module and its import edges", () => {
      const graph = service.buildGraph([
        buildTreeNode("MainModule", ["LoggerModule", "FeatureModule"]),
        buildTreeNode("FeatureModule", ["LoggerModule"]),
        buildTreeNode("LoggerModule", []),
      ]);

      expect(graph.moduleNames).toStrictEqual([
        "FeatureModule",
        "LoggerModule",
        "MainModule",
      ]);
      expect(graph.edges).toStrictEqual([
        { from: "FeatureModule", to: "LoggerModule" },
        { from: "MainModule", to: "FeatureModule" },
        { from: "MainModule", to: "LoggerModule" },
      ]);
    });

    // `debug` emits a module once per path that reaches it, so the same module
    // arrives more than once carrying different slices of its imports.
    it("merges the duplicate entries of a module reached by two paths", () => {
      const graph = service.buildGraph([
        buildTreeNode("MainModule", ["SharedModule"]),
        buildTreeNode("SharedModule", ["FirstModule"]),
        buildTreeNode("SharedModule", ["SecondModule"]),
      ]);

      expect(graph.moduleNames).toStrictEqual([
        "FirstModule",
        "MainModule",
        "SecondModule",
        "SharedModule",
      ]);
      expect(
        graph.edges.filter((edge) => edge.from === "SharedModule"),
      ).toStrictEqual([
        { from: "SharedModule", to: "FirstModule" },
        { from: "SharedModule", to: "SecondModule" },
      ]);
    });

    it("registers a module named only as an import", () => {
      const graph = service.buildGraph([
        buildTreeNode("MainModule", ["LoggerModule"]),
      ]);

      expect(graph.moduleNames).toStrictEqual(["LoggerModule", "MainModule"]);
      expect(graph.isolatedModuleNames).toStrictEqual([]);
    });

    it("reports a module with no edges as isolated", () => {
      const graph = service.buildGraph([buildTreeNode("MainModule", [])]);

      expect(graph.edges).toStrictEqual([]);
      expect(graph.isolatedModuleNames).toStrictEqual(["MainModule"]);
    });
  });

  describe("renderMermaid", () => {
    it("renders a fenced mermaid diagram of the edges", () => {
      const graph: NestjsModuleGraph = {
        edges: [
          { from: "MainModule", to: "FeatureModule" },
          { from: "MainModule", to: "LoggerModule" },
        ],
        isolatedModuleNames: [],
        moduleNames: ["FeatureModule", "LoggerModule", "MainModule"],
      };

      expect(service.renderMermaid(graph)).toBe(
        [
          "```mermaid",
          "flowchart LR",
          "  MainModule --> FeatureModule",
          "  MainModule --> LoggerModule",
          "```",
        ].join("\n"),
      );
    });

    it("declares isolated modules so they still appear", () => {
      const graph: NestjsModuleGraph = {
        edges: [],
        isolatedModuleNames: ["MainModule"],
        moduleNames: ["MainModule"],
      };

      expect(service.renderMermaid(graph)).toBe(
        ["```mermaid", "flowchart LR", "  MainModule", "```"].join("\n"),
      );
    });
  });

  describe("discoverProjects", () => {
    it("finds every project with a root module file", () => {
      workspaceEntries.set("applications", ["caelundas"]);
      workspaceEntries.set("packages", ["conformetry-cli"]);
      workspaceEntries.set("tools", ["synchronization"]);
      projectsWithRootModule.add("caelundas");
      projectsWithRootModule.add("conformetry-cli");
      projectsWithRootModule.add("synchronization");

      const projects = service.discoverProjects("/workspace");

      expect(projects.map((project) => project.name)).toStrictEqual([
        "caelundas",
        "conformetry-cli",
        "synchronization",
      ]);
      expect(projects[0]?.absoluteRoot).toBe(
        path.join("/workspace", "applications", "caelundas"),
      );
      expect(projects[0]?.rootModuleFile).toBe(
        path.join(
          "/workspace",
          "applications",
          "caelundas",
          "src/main.module.ts",
        ),
      );
    });

    it("sorts projects by name across workspace directories", () => {
      workspaceEntries.set("applications", ["zebra"]);
      workspaceEntries.set("packages", ["alpha"]);
      projectsWithRootModule.add("zebra");
      projectsWithRootModule.add("alpha");

      expect(
        service.discoverProjects("/workspace").map((project) => project.name),
      ).toStrictEqual(["alpha", "zebra"]);
    });

    // A package that only exports modules has no root to explore from.
    it("skips a project without a root module file", () => {
      workspaceEntries.set("packages", ["logger"]);

      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("skips an entry that is not a directory", () => {
      workspaceEntries.set("packages", ["README.md"]);
      workspaceFileEntries.add("README.md");
      projectsWithRootModule.add("README.md");

      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });

    it("skips a workspace directory that does not exist", () => {
      expect(service.discoverProjects("/workspace")).toStrictEqual([]);
    });
  });

  describe("exploreProject", () => {
    /** Points at a real file so the dynamic import resolves. */
    function buildProject(rootModuleFile: string): NestjsProject {
      return {
        absoluteRoot: process.cwd(),
        name: "synchronization",
        rootModuleFile: path.join(process.cwd(), rootModuleFile),
      };
    }

    it("explores the root module a project exports", async () => {
      spelunkedTree = [buildTreeNode("MainModule", ["LoggerModule"])];

      const graph = await service.exploreProject(
        buildProject("src/main.module.ts"),
      );

      expect(graph.moduleNames).toStrictEqual(["LoggerModule", "MainModule"]);
      expect(exploredModules[0]).toHaveProperty("name", "MainModule");
    });

    it("rejects a root module file that exports no MainModule", async () => {
      await expect(
        service.exploreProject(buildProject("src/constants.ts")),
      ).rejects.toThrow("MainModule");
    });
  });
});
