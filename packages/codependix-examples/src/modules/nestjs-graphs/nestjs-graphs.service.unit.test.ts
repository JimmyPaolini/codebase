import { ModuleGraphModule, NestjsProjectModule } from "@codependix/nestjs";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { LoggerModule } from "@codebase/logger";

import {
  BOUNDARY_CONTAINER,
  EMPTY_CONTAINER,
  FAILING_CONTAINER,
  GLOBAL_CONTAINER,
  PREVIEW_CONTAINER,
  ROOTED_APPLICATION,
  SMALL_CONTAINER,
} from "./nestjs-graphs.constants";
import { NestjsGraphsService } from "./nestjs-graphs.service";

describe(NestjsGraphsService, () => {
  let service: NestjsGraphsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [LoggerModule, ModuleGraphModule, NestjsProjectModule],
      providers: [NestjsGraphsService],
    }).compile();

    service = await module.resolve(NestjsGraphsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("the ambient-module heuristic", () => {
    it("names a global module ambient once the container is big enough", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(GLOBAL_CONTAINER);

      expect(graph.ambientModuleNames).toStrictEqual(["SettingsModule"]);
      expect(graph.edges).toStrictEqual([]);
    });

    it("leaves a global module's edges drawn below the minimum module count", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(SMALL_CONTAINER);

      expect(graph.ambientModuleNames).toStrictEqual([]);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it("counts inbound edges rather than reading decorators", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(BOUNDARY_CONTAINER);

      expect(graph.ambientModuleNames).toStrictEqual(["SettingsModule"]);
    });

    it("reports a project that defines no modules instead of drawing one", async () => {
      expect.hasAssertions();
      await expect(service.renderFixture(EMPTY_CONTAINER)).resolves.toBe(
        "_This project defines no NestJS modules to graph._",
      );
    });
  });

  describe("preview mode", () => {
    it("graphs a container whose options factory refuses to run", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(PREVIEW_CONTAINER);

      expect(graph.moduleNames).toContain("CatalogModule");
      expect(graph.moduleNames).toContain("ConnectionModule");
    });
  });

  describe("container rooting", () => {
    it("explores a rooted project outward from its own MainModule", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(ROOTED_APPLICATION);

      expect(graph.moduleNames).toStrictEqual([
        "CatalogModule",
        "InventoryModule",
        "MainModule",
      ]);
    });

    it("keeps the synthetic root and its config scaffolding out of the graph", async () => {
      expect.hasAssertions();

      const graph = await service.buildFixtureGraph(GLOBAL_CONTAINER);

      expect(graph.moduleNames).not.toContain("SyntheticRootModule");
      expect(graph.moduleNames).not.toContain("ConfigModule");
    });
  });

  describe("exploreAll", () => {
    it("isolates one project's failure from every other project", async () => {
      expect.hasAssertions();

      const explorations = await service.exploreAll([
        ROOTED_APPLICATION,
        FAILING_CONTAINER,
        EMPTY_CONTAINER,
      ]);

      expect(
        explorations.map((exploration) => exploration.outcome),
      ).toStrictEqual(["explored", "failed", "explored"]);
    });
  });

  describe("describeError", () => {
    it("names the error class when an Error was raised", () => {
      expect.hasAssertions();
      expect(service.describeError(new TypeError("no root"))).toBe(
        "TypeError: no root",
      );
    });

    it("falls back to the raised value itself when it was not an Error", () => {
      expect.hasAssertions();
      expect(service.describeError("no root")).toBe("no root");
    });
  });

  describe("build", () => {
    it("builds the ambient, preview, and rooting documents", async () => {
      expect.hasAssertions();

      const documents = await service.build();

      expect(documents.map((document) => document.id)).toStrictEqual([
        "03-ambient-modules",
        "04-preview-mode",
        "05-container-rooting",
      ]);
    });
  });
});
