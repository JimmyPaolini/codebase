import { DeliveryModule } from "@codependix/cli";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import { NestjsGraphsModule } from "../nestjs-graphs/nestjs-graphs.module";
import { NxGraphsModule } from "../nx-graphs/nx-graphs.module";
import { PythonImportsModule } from "../python-imports/python-imports.module";
import { TypescriptImportsModule } from "../typescript-imports/typescript-imports.module";

import { GraphLevelsService } from "./graph-levels.service";

describe(GraphLevelsService, () => {
  let service: GraphLevelsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        LoggerModule,
        DeliveryModule,
        NestjsGraphsModule,
        NxGraphsModule,
        PythonImportsModule,
        TypescriptImportsModule,
      ],
      providers: [GraphLevelsService],
    }).compile();

    service = await module.resolve(GraphLevelsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("buildLevels", () => {
    it("renders every level from the one shared fixture", async () => {
      expect.hasAssertions();

      const levels = await service.buildLevels();

      expect(levels.map((level) => level.title)).toStrictEqual([
        "Nx Neighborhood",
        "Nx Workspace Graph",
        "NestJS module graph",
        "TypeScript file imports",
        "Python file imports",
      ]);
    });

    it("draws only modules in the module graph, never a provider", async () => {
      expect.hasAssertions();

      const levels = await service.buildLevels();

      expect(levels[2]?.diagram).toContain("CatalogModule");
      expect(levels[2]?.diagram).not.toContain("CatalogService");
    });

    it("draws the file the module graph cannot see in the import graph", async () => {
      expect.hasAssertions();

      const levels = await service.buildLevels();

      expect(levels[3]?.diagram).toContain("src/settings.ts");
      expect(levels[2]?.diagram).not.toContain("settings.ts");
    });
  });

  describe("build", () => {
    it("builds the graph-levels and embedding documents", async () => {
      expect.hasAssertions();

      const documents = await service.build();

      expect(documents.map((document) => document.id)).toStrictEqual([
        "01-graph-levels",
        "09-embedding",
      ]);
    });

    it("commits one JSON export per graph level", async () => {
      expect.hasAssertions();

      const [levels] = await service.build();

      expect(
        levels?.jsonExports.map((jsonExport) => jsonExport.fileName),
      ).toStrictEqual([
        "codependix-neighborhood-graph.json",
        "codependix-workspace-graph.json",
        "codependix-module-graph.json",
        "codependix-imports-graph.json",
        "codependix-python-imports-graph.json",
      ]);
    });

    it("renders every JSON export the way a real run would", async () => {
      expect.hasAssertions();

      const [levels] = await service.build();

      for (const jsonExport of levels?.jsonExports ?? []) {
        expect(jsonExport.content).toMatch(/^\{\n {2}"/u);
        expect(jsonExport.content.endsWith("}\n")).toBe(true);
      }
    });
  });
});
