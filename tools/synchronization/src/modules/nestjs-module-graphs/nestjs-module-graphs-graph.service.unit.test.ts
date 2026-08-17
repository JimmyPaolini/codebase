import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { NestjsModuleGraphsGraphService } from "./nestjs-module-graphs-graph.service";

import type { NestjsModuleGraph } from "./nestjs-module-graphs.types";
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

describe(NestjsModuleGraphsGraphService, () => {
  let service: NestjsModuleGraphsGraphService;

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
      const graph = service.buildGraph([
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
        { from: "FeatureModule", to: "OtherModule" },
        { from: "MainModule", to: "FeatureModule" },
        { from: "MainModule", to: "OtherModule" },
      ]);
      expect(graph.ambientModuleNames).toStrictEqual([]);
    });

    it("registers a module named only as an import", () => {
      const graph = service.buildGraph([
        buildNode("MainModule", ["OtherModule"]),
      ]);

      expect(graph.moduleNames).toStrictEqual(["MainModule", "OtherModule"]);
    });

    it("reports a module with no edges as isolated", () => {
      const graph = service.buildGraph([buildNode("MainModule", [])]);

      expect(graph.edges).toStrictEqual([]);
      expect(graph.isolatedModuleNames).toStrictEqual(["MainModule"]);
    });

    // A global module is registered into every module in the container, so
    // drawing its edges would add one per module and say nothing.
    it("drops the edges into a module every other module imports", () => {
      const graph = service.buildGraph(buildAmbientTree(6, "LoggerModule"));

      expect(graph.ambientModuleNames).toStrictEqual(["LoggerModule"]);
      expect(graph.edges).toStrictEqual([]);
    });

    it("keeps an ambient module as a node of its own", () => {
      const graph = service.buildGraph(buildAmbientTree(6, "LoggerModule"));

      expect(graph.moduleNames).toContain("LoggerModule");
      expect(graph.isolatedModuleNames).toContain("LoggerModule");
    });

    it("keeps the edges into a module only some modules import", () => {
      const graph = service.buildGraph([
        buildNode("MainModule", ["SharedModule", "FirstModule"]),
        buildNode("FirstModule", ["SharedModule"]),
        buildNode("SecondModule", []),
        buildNode("ThirdModule", []),
        buildNode("SharedModule", []),
      ]);

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges).toContainEqual({
        from: "FirstModule",
        to: "SharedModule",
      });
    });

    // Below the minimum, the single import of a two-module graph would look
    // exactly like a global module and vanish.
    it("does not treat a small graph's only import as ambient", () => {
      const graph = service.buildGraph(buildAmbientTree(3, "LoggerModule"));

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges).toHaveLength(2);
    });
  });

  describe("renderMermaid", () => {
    it("renders a fenced mermaid diagram of the edges", () => {
      const graph: NestjsModuleGraph = {
        ambientModuleNames: [],
        edges: [
          { from: "MainModule", to: "FeatureModule" },
          { from: "MainModule", to: "OtherModule" },
        ],
        isolatedModuleNames: [],
        moduleNames: ["FeatureModule", "MainModule", "OtherModule"],
      };

      expect(service.renderMermaid(graph)).toBe(
        [
          "```mermaid",
          "flowchart LR",
          "  MainModule --> FeatureModule",
          "  MainModule --> OtherModule",
          "```",
        ].join("\n"),
      );
    });

    it("declares isolated modules so they still appear", () => {
      const graph: NestjsModuleGraph = {
        ambientModuleNames: ["LoggerModule"],
        edges: [],
        isolatedModuleNames: ["LoggerModule"],
        moduleNames: ["LoggerModule"],
      };

      expect(service.renderMermaid(graph)).toBe(
        ["```mermaid", "flowchart LR", "  LoggerModule", "```"].join("\n"),
      );
    });
  });
});
