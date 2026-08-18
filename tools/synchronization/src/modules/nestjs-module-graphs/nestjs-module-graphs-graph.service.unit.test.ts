import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";

import type {
  NestjsModuleGraph,
  NestjsModuleOwnership,
  NestjsProjectImports,
} from "./nestjs-module-graphs.types";
import type { SpelunkedTree } from "nestjs-spelunker";

/** Builds a graph of `count` modules that all import `ambientName`. */
function buildAmbientTree(count: number, ambientName: string): SpelunkedTree[] {
  return [
    buildNode(ambientName, []),
    ...Array.from({ length: count - 1 }, (_unused, index) =>
      buildNode(`Feature${index}Module`, [ambientName]),
    ),
  ];
}

/** Builds an explored node with only the fields the graph reads. */
function buildNode(name: string, imports: string[]): SpelunkedTree {
  return { controllers: [], exports: [], imports, name, providers: {} };
}

/** Builds an ownership record from a module-name-to-projects map. */
function buildOwnership(
  projectsByModule: Record<string, string[]> = {},
  frameworkModuleNames: string[] = [],
  imports: Partial<NestjsProjectImports> = {},
): NestjsModuleOwnership {
  return {
    frameworkModuleNames: new Set(frameworkModuleNames),
    importsByProject: new Map([
      [
        "example",
        {
          projects: imports.projects ?? new Set<string>(),
          projectsByModule:
            imports.projectsByModule ?? new Map<string, string>(),
          runtimeModuleEdges: imports.runtimeModuleEdges ?? [],
          typeOnlyProjects: imports.typeOnlyProjects ?? new Set<string>(),
        },
      ],
    ]),
    projectsByModule: new Map(Object.entries(projectsByModule)),
  };
}

describe(NestjsModuleGraphsGraphService, () => {
  let service: NestjsModuleGraphsGraphService;

  /** Builds a graph for a project owning nothing in particular. */
  function build(
    tree: SpelunkedTree[],
    ownership: NestjsModuleOwnership = buildOwnership(),
    projectName = "example",
  ): NestjsModuleGraph {
    return service.buildGraph({ ownership, projectName, tree });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [NestjsModuleGraphsGraphService],
    }).compile();

    service = await module.resolve(NestjsModuleGraphsGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildGraph", () => {
    it("collects every module and its import edges", () => {
      const graph = build([
        buildNode("MainModule", ["FeatureModule", "OtherModule"]),
        buildNode("FeatureModule", ["OtherModule"]),
        buildNode("OtherModule", []),
      ]);

      expect(graph.moduleNames).toStrictEqual([
        "FeatureModule",
        "MainModule",
        "OtherModule",
      ]);
      expect(graph.edges).toStrictEqual([
        { from: "FeatureModule", runtime: false, to: "OtherModule" },
        { from: "MainModule", runtime: false, to: "FeatureModule" },
        { from: "MainModule", runtime: false, to: "OtherModule" },
      ]);
    });

    it("reports a module with no edges as isolated", () => {
      const graph = build([buildNode("MainModule", [])]);

      expect(graph.edges).toStrictEqual([]);
      expect(graph.isolatedModuleNames).toStrictEqual(["MainModule"]);
    });

    // A global module is registered into every module in the container, so
    // drawing its edges would add one per module and say nothing.
    it("drops the edges into a module every other module imports", () => {
      const graph = build(buildAmbientTree(6, "LoggerModule"));

      expect(graph.ambientModuleNames).toStrictEqual(["LoggerModule"]);
      expect(graph.edges).toStrictEqual([]);
      expect(graph.isolatedModuleNames).toContain("LoggerModule");
    });

    it("keeps the edges into a module only some modules import", () => {
      const graph = build([
        buildNode("MainModule", ["SharedModule", "FirstModule"]),
        buildNode("FirstModule", ["SharedModule"]),
        buildNode("SecondModule", []),
        buildNode("SharedModule", []),
      ]);

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges).toContainEqual({
        from: "FirstModule",
        runtime: false,
        to: "SharedModule",
      });
    });

    // Below the minimum, the single import of a two-module graph would look
    // exactly like a global module and vanish.
    it("does not treat a small graph's only import as ambient", () => {
      const graph = build(buildAmbientTree(3, "LoggerModule"));

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges).toHaveLength(2);
    });
  });

  describe("grouping", () => {
    it("groups modules under the project that defines them", () => {
      const graph = build(
        [buildNode("MainModule", ["LoggerModule"])],
        buildOwnership({
          LoggerModule: ["logger"],
          MainModule: ["example"],
        }),
      );

      expect(graph.groups).toStrictEqual([
        { moduleNames: ["MainModule"], projectName: "example" },
        { moduleNames: ["LoggerModule"], projectName: "logger" },
      ]);
    });

    // Every application defines a `MainModule`, and two packages here define a
    // `ConfigurationModule`; the project being graphed settles both.
    it("credits a name more than one project defines to the graphed project", () => {
      const graph = build(
        [buildNode("MainModule", [])],
        buildOwnership({ MainModule: ["caelundas", "example"] }),
      );

      expect(graph.groups).toStrictEqual([
        { moduleNames: ["MainModule"], projectName: "example" },
      ]);
    });

    it("credits a name several other projects define to nobody", () => {
      const graph = build(
        [buildNode("ConfigurationModule", [])],
        buildOwnership({ ConfigurationModule: ["first", "second"] }),
      );

      expect(graph.groups).toStrictEqual([
        { moduleNames: ["ConfigurationModule"], projectName: undefined },
      ]);
    });

    // Two packages here define a `ConfigurationModule`; the project's own
    // source says which one it imported.
    it("settles a shared name by where the project imported it from", () => {
      const graph = build(
        [buildNode("ConfigurationModule", [])],
        buildOwnership(
          {
            ConfigurationModule: [
              "codometer-configuration",
              "conformetry-configuration",
            ],
          },
          [],
          {
            projectsByModule: new Map([
              ["ConfigurationModule", "conformetry-configuration"],
            ]),
          },
        ),
      );

      expect(graph.groups).toStrictEqual([
        {
          moduleNames: ["ConfigurationModule"],
          projectName: "conformetry-configuration",
        },
      ]);
    });

    it("credits a shared name to nobody when the project imports neither", () => {
      const graph = build(
        [buildNode("ConfigurationModule", [])],
        buildOwnership({ ConfigurationModule: ["first", "second"] }),
      );

      expect(graph.groups[0]?.projectName).toBeUndefined();
    });

    // `DiscoveryModule` is both a `@nestjs/core` module and one a package here
    // defines, and the name alone cannot tell them apart.
    it("credits a name NestJS also exports to nobody", () => {
      const graph = build(
        [buildNode("DiscoveryModule", [])],
        buildOwnership({ DiscoveryModule: ["other"] }, ["DiscoveryModule"]),
      );

      expect(graph.groups).toStrictEqual([
        { moduleNames: ["DiscoveryModule"], projectName: undefined },
      ]);
    });

    it("orders two other projects alphabetically", () => {
      const graph = build(
        [buildNode("MainModule", ["ZebraModule", "AlphaModule"])],
        buildOwnership({
          AlphaModule: ["alpha"],
          MainModule: ["example"],
          ZebraModule: ["zebra"],
        }),
      );

      expect(graph.groups.map((group) => group.projectName)).toStrictEqual([
        "example",
        "alpha",
        "zebra",
      ]);
    });

    it("orders the graphed project first and the ungrouped modules last", () => {
      const graph = build(
        [buildNode("MainModule", ["AlphaModule", "ConfigModule"])],
        buildOwnership({
          AlphaModule: ["alpha"],
          MainModule: ["example"],
        }),
      );

      expect(graph.groups.map((group) => group.projectName)).toStrictEqual([
        "example",
        "alpha",
        undefined,
      ]);
    });
  });

  describe("runtime edges", () => {
    // A module loaded through `LazyModuleLoader` is named rather than
    // imported, so the name is the only evidence the dependency exists.
    it("draws an edge to a module the project only names", () => {
      const graph = build(
        [buildNode("ValidationModule", [])],
        buildOwnership(
          {
            JsonValidatorModule: ["conformetry-json"],
            ValidationModule: ["example"],
          },
          [],
          {
            runtimeModuleEdges: [
              {
                from: "ValidationModule",
                runtime: true,
                to: "JsonValidatorModule",
              },
            ],
          },
        ),
      );

      expect(graph.edges).toContainEqual({
        from: "ValidationModule",
        runtime: true,
        to: "JsonValidatorModule",
      });
      expect(service.renderMermaid(graph)).toContain(
        "ValidationModule -.-> JsonValidatorModule",
      );
    });

    // This command's own constants name a `"MainModule"`, and every
    // application defines one.
    it("ignores a named module several projects define", () => {
      const graph = build(
        [buildNode("SynchronizationModule", [])],
        buildOwnership(
          {
            MainModule: ["caelundas", "conformetry-cli"],
            SynchronizationModule: ["example"],
          },
          [],
          {
            runtimeModuleEdges: [
              {
                from: "SynchronizationModule",
                runtime: true,
                to: "MainModule",
              },
            ],
          },
        ),
      );

      expect(graph.edges).toStrictEqual([]);
    });

    it("ignores a named module the container already holds", () => {
      const graph = build(
        [buildNode("ValidationModule", ["FilesModule"])],
        buildOwnership({ FilesModule: ["conformetry-files"] }, [], {
          runtimeModuleEdges: [
            { from: "ValidationModule", runtime: true, to: "FilesModule" },
          ],
        }),
      );

      expect(graph.edges.filter((edge) => edge.runtime)).toStrictEqual([]);
    });
  });

  describe("renderMermaid", () => {
    it("renders each project's modules in a labelled subgraph", () => {
      const graph = build(
        [buildNode("MainModule", ["LoggerModule"])],
        buildOwnership({
          LoggerModule: ["logger"],
          MainModule: ["example"],
        }),
      );

      expect(service.renderMermaid(graph)).toBe(
        [
          "```mermaid",
          "flowchart LR",
          '  subgraph group0["example"]',
          "    MainModule",
          "  end",
          '  subgraph group1["logger"]',
          "    LoggerModule",
          "  end",
          "  MainModule --> LoggerModule",
          "```",
        ].join("\n"),
      );
    });

    it("renders a module belonging to no project outside any subgraph", () => {
      const graph = build([buildNode("ConfigModule", [])]);

      expect(service.renderMermaid(graph)).toBe(
        ["```mermaid", "flowchart LR", "  ConfigModule", "```"].join("\n"),
      );
    });

    it("draws an ambient module rounded and explains the shape", () => {
      const graph = build(buildAmbientTree(6, "LoggerModule"));
      const diagram = service.renderMermaid(graph);

      expect(diagram).toContain("  LoggerModule([LoggerModule])");
      expect(diagram).toContain("_Rounded modules are global");
    });

    // A dependency reached only through types, or loaded lazily, is real at
    // the project level and absent here; saying so stops the two diagrams from
    // looking like they disagree.
    it("names a dependency reached only for its types", () => {
      const graph = build(
        [buildNode("JsonValidatorModule", [])],
        buildOwnership({ JsonValidatorModule: ["example"] }, [], {
          projects: new Set(["conformetry-core"]),
          typeOnlyProjects: new Set(["conformetry-core"]),
        }),
      );

      expect(graph.typeOnlyDependencyNames).toStrictEqual(["conformetry-core"]);
      expect(service.renderMermaid(graph)).toContain(
        "Reached only for their types",
      );
    });

    it("names a dependency reached only at runtime", () => {
      const graph = build(
        [buildNode("ValidationModule", [])],
        buildOwnership({ ValidationModule: ["example"] }, [], {
          projects: new Set(["conformetry-text"]),
        }),
      );

      expect(graph.runtimeDependencyNames).toStrictEqual(["conformetry-text"]);
      expect(service.renderMermaid(graph)).toContain(
        "Loaded at runtime rather than imported",
      );
    });

    it("lists several absent dependencies as prose", () => {
      expect(service.renderNameList(["first", "second", "third"])).toBe(
        "first, second and third",
      );
      expect(service.renderNameList(["only"])).toBe("only");
      expect(service.renderNameList([])).toBe("");
    });

    it("leaves the legend out when no module is ambient", () => {
      const diagram = service.renderMermaid(
        build([buildNode("MainModule", [])]),
      );

      expect(diagram).not.toContain("_Rounded modules are global");
    });
  });
});
