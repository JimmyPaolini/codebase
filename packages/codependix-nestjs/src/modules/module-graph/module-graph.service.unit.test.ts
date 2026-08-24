import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ModuleGraphService } from "./module-graph.service";

import type { SpelunkedTree } from "nestjs-spelunker";

/** Builds a spelunked tree node with sensible defaults for a test. */
function buildNode(name: string, imports: string[] = []): SpelunkedTree {
  return { controllers: [], exports: [], imports, name, providers: {} };
}

describe(ModuleGraphService, () => {
  let service: ModuleGraphService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ModuleGraphService],
    }).compile();

    service = await module.resolve(ModuleGraphService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildGraph", () => {
    it("names every module in the tree", () => {
      const graph = service.buildGraph(
        [buildNode("MainModule", ["LoggerModule"]), buildNode("LoggerModule")],
        "caelundas",
      );

      expect(graph.moduleNames).toStrictEqual(["LoggerModule", "MainModule"]);
      expect(graph.projectName).toBe("caelundas");
    });

    it("draws an edge for every import", () => {
      const graph = service.buildGraph(
        [buildNode("MainModule", ["LoggerModule"]), buildNode("LoggerModule")],
        "caelundas",
      );

      expect(graph.edges).toStrictEqual([
        { source: "MainModule", target: "LoggerModule" },
      ]);
    });

    it("sorts edges by source then target", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["LoggerModule", "ConfigurationModule"]),
          buildNode("LoggerModule"),
          buildNode("ConfigurationModule"),
        ],
        "caelundas",
      );

      expect(graph.edges).toStrictEqual([
        { source: "MainModule", target: "ConfigurationModule" },
        { source: "MainModule", target: "LoggerModule" },
      ]);
    });

    it("names a module with no drawn edge as isolated", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["LoggerModule"]),
          buildNode("LoggerModule"),
          buildNode("OrphanModule"),
        ],
        "caelundas",
      );

      expect(graph.isolatedModuleNames).toStrictEqual(["OrphanModule"]);
    });

    it("does not treat a module imported by everything as ambient below the minimum size", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["SharedModule"]),
          buildNode("OtherModule", ["SharedModule"]),
          buildNode("SharedModule"),
        ],
        "caelundas",
      );

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges).toStrictEqual([
        { source: "MainModule", target: "SharedModule" },
        { source: "OtherModule", target: "SharedModule" },
      ]);
    });

    it("does not treat a module imported by only some others as ambient", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["GlobalModule", "SecondModule"]),
          buildNode("FirstModule", ["GlobalModule"]),
          buildNode("SecondModule", ["GlobalModule"]),
          buildNode("ThirdModule", ["GlobalModule"]),
          buildNode("GlobalModule"),
        ],
        "caelundas",
      );

      expect(graph.ambientModuleNames).toStrictEqual(["GlobalModule"]);
      expect(graph.edges).toStrictEqual([
        { source: "MainModule", target: "SecondModule" },
      ]);
    });

    it("treats a module imported by every other module as ambient", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["GlobalModule"]),
          buildNode("FirstModule", ["GlobalModule"]),
          buildNode("SecondModule", ["GlobalModule"]),
          buildNode("GlobalModule"),
        ],
        "caelundas",
      );

      expect(graph.ambientModuleNames).toStrictEqual(["GlobalModule"]);
    });

    it("leaves an ambient module's inbound edges out of the drawn edges", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["GlobalModule"]),
          buildNode("FirstModule", ["GlobalModule"]),
          buildNode("SecondModule", ["GlobalModule"]),
          buildNode("GlobalModule"),
        ],
        "caelundas",
      );

      expect(graph.edges).toStrictEqual([]);
    });
  });

  describe("renderMermaid", () => {
    it("renders a fenced mermaid diagram of the modules and their edges", () => {
      const graph = service.buildGraph(
        [buildNode("MainModule", ["LoggerModule"]), buildNode("LoggerModule")],
        "caelundas",
      );

      expect(service.renderMermaid(graph)).toBe(
        [
          "```mermaid",
          "flowchart LR",
          "  LoggerModule",
          "  MainModule",
          "  MainModule --> LoggerModule",
          "```",
        ].join("\n"),
      );
    });

    it("renders an ambient module as a rounded node with a legend", () => {
      const graph = service.buildGraph(
        [
          buildNode("MainModule", ["GlobalModule"]),
          buildNode("FirstModule", ["GlobalModule"]),
          buildNode("SecondModule", ["GlobalModule"]),
          buildNode("GlobalModule"),
        ],
        "caelundas",
      );

      const diagram = service.renderMermaid(graph);

      expect(diagram).toContain("GlobalModule([GlobalModule])");
      expect(diagram).toContain("_Rounded modules are global");
    });

    it("states in words that an empty project has no modules to graph", () => {
      const graph = service.buildGraph([], "caelundas");

      expect(service.renderMermaid(graph)).toBe(
        "_This project defines no NestJS modules to graph._",
      );
    });
  });
});
