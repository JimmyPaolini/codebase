import { Test } from "@nestjs/testing";
import { createProjectGraphAsync } from "@nx/devkit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { ProjectsService } from "./projects.service";

import type { ProjectGraph } from "@nx/devkit";

vi.mock("@nx/devkit", () => ({
  createProjectGraphAsync: vi.fn<() => Promise<unknown>>(async () => {
    await Promise.resolve();

    return { dependencies: {}, nodes: {} };
  }),
}));

/** Builds a project graph from a name-to-root map. */
function buildGraph(roots: Record<string, string>): ProjectGraph {
  return {
    dependencies: {},
    nodes: Object.fromEntries(
      Object.entries(roots).map(([name, root]) => [
        name,
        { data: { root }, name, type: "lib" },
      ]),
    ),
  };
}

describe(ProjectsService, () => {
  let service: ProjectsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ProjectsService],
    }).compile();

    service = await module.resolve(ProjectsService);
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("readProjectGraph", () => {
    it("reads the workspace project graph without exiting on error", async () => {
      expect.hasAssertions();

      await expect(service.readProjectGraph()).resolves.toStrictEqual({
        dependencies: {},
        nodes: {},
      });
      expect(createProjectGraphAsync).toHaveBeenCalledWith({
        exitOnError: false,
      });
    });
  });

  describe("readProjects", () => {
    it("lists every project the graph knows, sorted by name", () => {
      expect.hasAssertions();

      const graph = buildGraph({
        "callidescope-cli": "packages/callidescope-cli",
        "callidescope-graph": "packages/callidescope-graph",
      });

      expect(service.readProjects(graph)).toStrictEqual([
        { name: "callidescope-cli", root: "packages/callidescope-cli" },
        { name: "callidescope-graph", root: "packages/callidescope-graph" },
      ]);
    });

    it("keeps a project rooted at the workspace root", () => {
      expect.hasAssertions();

      expect(service.readProjects(buildGraph({ codebase: "." }))).toStrictEqual(
        [{ name: "codebase", root: "." }],
      );
    });

    it("lists nothing for an empty graph", () => {
      expect.hasAssertions();
      expect(service.readProjects(buildGraph({}))).toStrictEqual([]);
    });
  });

  describe("resolveDirectories", () => {
    const graph = buildGraph({
      "callidescope-cli": "packages/callidescope-cli",
      "callidescope-graph": "packages/callidescope-graph",
      validation: "tools/validation",
    });

    it("resolves each name to its workspace-relative root", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["validation", "callidescope-cli"],
        }),
      ).toStrictEqual({
        directories: ["packages/callidescope-cli", "tools/validation"],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        unknownNames: [],
      });
    });

    it("sorts and deduplicates the directories it resolved", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: [
            "callidescope-graph",
            "callidescope-cli",
            "callidescope-graph",
          ],
        }).directories,
      ).toStrictEqual([
        "packages/callidescope-cli",
        "packages/callidescope-graph",
      ]);
    });

    it("collects the names the graph does not know", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({
          graph,
          projectNames: ["callidescope-cli", "callidescope-nix", "typo"],
        }),
      ).toStrictEqual({
        directories: ["packages/callidescope-cli"],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        unknownNames: ["callidescope-nix", "typo"],
      });
    });

    it("resolves nothing when it was given nothing", () => {
      expect.hasAssertions();

      expect(
        service.resolveDirectories({ graph, projectNames: [] }),
      ).toStrictEqual({
        directories: [],
        knownNames: ["callidescope-cli", "callidescope-graph", "validation"],
        unknownNames: [],
      });
    });
  });
});
