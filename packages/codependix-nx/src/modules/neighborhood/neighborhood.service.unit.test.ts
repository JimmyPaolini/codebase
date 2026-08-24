import path from "node:path";

import { Test } from "@nestjs/testing";
import { createProjectGraphAsync } from "@nx/devkit";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { NeighborhoodService } from "./neighborhood.service";

import type { Neighborhood, NxProject } from "./neighborhood.types";
import type { ProjectGraph } from "@nx/devkit";

vi.mock("@nx/devkit", () => ({
  createProjectGraphAsync: vi.fn<() => Promise<unknown>>(async () => {
    await Promise.resolve();

    return { dependencies: {}, nodes: {} };
  }),
}));

/** Builds a project graph from a name-to-dependency-names map. */
function buildGraph(
  dependencies: Record<string, [string, string][]>,
  roots: Record<string, string> = {},
): ProjectGraph {
  const names = new Set([
    ...Object.keys(dependencies),
    ...Object.values(dependencies).flatMap((edges) =>
      edges.map(([target]) => target),
    ),
    ...Object.keys(roots),
  ]);

  return {
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([source, edges]) => [
        source,
        edges.map(([target, type]) => ({ source, target, type })),
      ]),
    ),
    nodes: Object.fromEntries(
      [...names].map((name) => [
        name,
        {
          data: { root: roots[name] ?? `packages/${name}` },
          name,
          type: "lib",
        },
      ]),
    ),
  };
}

/** Names the projects a graph holds. */
function buildProjects(names: string[]): NxProject[] {
  return names.map((name) => ({
    absoluteRoot: path.join("/workspace/packages", name),
    name,
  }));
}

/** Reads the neighborhood a graph is expected to hold for a project. */
function readNeighborhood(
  neighborhoods: Map<string, Neighborhood>,
  projectName: string,
): Neighborhood {
  const neighborhood = neighborhoods.get(projectName);

  if (neighborhood === undefined) {
    throw new Error(`No neighborhood for ${projectName}`);
  }

  return neighborhood;
}

describe(NeighborhoodService, () => {
  let service: NeighborhoodService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NeighborhoodService],
    }).compile();

    service = await module.resolve(NeighborhoodService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readProjectGraph", () => {
    // Nx exits the process on a graph error by default, which would take the
    // whole codependix run with it.
    it("reads the graph without letting Nx exit the process", async () => {
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
    it("resolves each project's directory against the workspace root", () => {
      const graph = buildGraph({}, { logger: "packages/logger" });

      expect(service.readProjects(graph, "/workspace")).toStrictEqual([
        {
          absoluteRoot: path.join("/workspace", "packages/logger"),
          name: "logger",
        },
      ]);
    });

    it("sorts every project by name", () => {
      const graph = buildGraph(
        {},
        {
          affirmations: "applications/affirmations",
          caelundas: "packages/caelundas",
        },
      );

      expect(
        service
          .readProjects(graph, "/workspace")
          .map((project) => project.name),
      ).toStrictEqual(["affirmations", "caelundas"]);
    });

    // The root project contains every other one rather than depending on them.
    it("leaves out the workspace root project", () => {
      const graph = buildGraph(
        {},
        { codebase: ".", logger: "packages/logger" },
      );

      expect(
        service
          .readProjects(graph, "/workspace")
          .map((project) => project.name),
      ).toStrictEqual(["logger"]);
    });
  });

  describe("buildNeighborhoods", () => {
    it("reports what a project depends on and what depends on it", () => {
      const graph = buildGraph({
        caelundas: [["logger", "static"]],
        codependixNx: [["logger", "static"]],
      });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["caelundas", "logger", "codependixNx"]),
        ),
        "logger",
      );

      expect(neighborhood.dependencies).toStrictEqual([]);
      expect(neighborhood.dependents).toStrictEqual([
        "caelundas",
        "codependixNx",
      ]);
    });

    it("reports a project's own dependencies", () => {
      const graph = buildGraph({ caelundas: [["logger", "static"]] });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["caelundas", "logger"]),
        ),
        "caelundas",
      );

      expect(neighborhood.dependencies).toStrictEqual(["logger"]);
      expect(neighborhood.dependents).toStrictEqual([]);
    });

    it("leaves out edges to projects outside the workspace", () => {
      const graph = buildGraph({ caelundas: [["npm:rxjs", "static"]] });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(graph, buildProjects(["caelundas"])),
        "caelundas",
      );

      expect(neighborhood.edges).toStrictEqual([]);
    });

    it("leaves out a project's edge to itself", () => {
      const graph = buildGraph({ caelundas: [["caelundas", "static"]] });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(graph, buildProjects(["caelundas"])),
        "caelundas",
      );

      expect(neighborhood.edges).toStrictEqual([]);
    });

    // Nx reports the same pair twice when a static import is also declared as
    // an implicit dependency; the import is the stronger statement.
    it("keeps a pair static when it is declared both ways", () => {
      const graph = buildGraph({
        lexico: [
          ["lexico-components", "implicit"],
          ["lexico-components", "static"],
        ],
      });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["lexico", "lexico-components"]),
        ),
        "lexico",
      );

      expect(neighborhood.edges).toStrictEqual([
        { implicit: false, source: "lexico", target: "lexico-components" },
      ]);
    });

    it("sorts edges sharing a source by their target", () => {
      const graph = buildGraph({
        lexico: [
          ["lexico-entities", "static"],
          ["lexico-components", "static"],
        ],
      });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["lexico", "lexico-components", "lexico-entities"]),
        ),
        "lexico",
      );

      expect(neighborhood.edges.map((edge) => edge.target)).toStrictEqual([
        "lexico-components",
        "lexico-entities",
      ]);
    });

    it("marks an edge Nx only inferred from configuration as implicit", () => {
      const graph = buildGraph({ lexico: [["lexico-components", "implicit"]] });

      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["lexico", "lexico-components"]),
        ),
        "lexico",
      );

      expect(neighborhood.edges[0]?.implicit).toBe(true);
    });
  });

  describe("renderMermaid", () => {
    it("renders the neighborhood and marks the project it centres on", () => {
      const graph = buildGraph({ caelundas: [["logger", "static"]] });
      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["caelundas", "logger"]),
        ),
        "caelundas",
      );

      expect(service.renderMermaid(neighborhood)).toBe(
        [
          "```mermaid",
          "graph LR",
          '  caelundas["caelundas"]',
          '  logger["logger"]',
          "  caelundas --> logger",
          "  classDef subject fill:#7c3aed,color:#fff,stroke:#4c1d95,stroke-width:2px",
          "  class caelundas subject",
          "```",
        ].join("\n"),
      );
    });

    it("draws an implicit edge dotted and explains it", () => {
      const graph = buildGraph({ lexico: [["lexico-components", "implicit"]] });
      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["lexico", "lexico-components"]),
        ),
        "lexico",
      );

      const diagram = service.renderMermaid(neighborhood);

      expect(diagram).toContain("lexico -.-> lexico_components");
      expect(diagram).toContain("_Dashed edges are dependencies Nx inferred");
    });

    it("states in words that an unconnected project has no neighbors", () => {
      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          buildGraph({}),
          buildProjects(["affirmations"]),
        ),
        "affirmations",
      );

      expect(service.renderMermaid(neighborhood)).toBe(
        "_This project has no immediate Nx dependencies or dependents._",
      );
    });

    it("gives a hyphenated project name an identifier mermaid accepts", () => {
      const graph = buildGraph({ "codometer-cli": [["logger", "static"]] });
      const neighborhood = readNeighborhood(
        service.buildNeighborhoods(
          graph,
          buildProjects(["codometer-cli", "logger"]),
        ),
        "codometer-cli",
      );

      expect(service.renderMermaid(neighborhood)).toContain(
        '  codometer_cli["codometer-cli"]',
      );
      expect(service.renderMermaid(neighborhood)).toContain(
        "  codometer_cli --> logger",
      );
    });
  });
});
