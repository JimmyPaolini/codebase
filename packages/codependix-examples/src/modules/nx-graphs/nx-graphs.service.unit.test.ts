import { NeighborhoodModule, WorkspaceGraphModule } from "@codependix/nx";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ATLAS_CHAIN,
  ATLAS_DOUBLE_DECLARED,
  ATLAS_EXTERNAL,
  ATLAS_INFERRED,
  ATLAS_SELF_DEPENDENT,
  ATLAS_UNCONNECTED,
  SUBJECT_PROJECT_NAME,
} from "./nx-graphs.constants";
import { NxGraphsService } from "./nx-graphs.service";

describe(NxGraphsService, () => {
  let service: NxGraphsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [NeighborhoodModule, WorkspaceGraphModule],
      providers: [NxGraphsService],
    }).compile();

    service = await module.resolve(NxGraphsService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readProjects", () => {
    it("leaves the workspace root project out", () => {
      expect.hasAssertions();
      expect(
        service.readProjects(ATLAS_CHAIN).map((project) => project.name),
      ).toStrictEqual(["atlas-application", "atlas-core", "atlas-service"]);
    });
  });

  describe("buildNeighborhood", () => {
    it("holds one hop in each direction and no further", () => {
      expect.hasAssertions();

      const neighborhood = service.buildNeighborhood(
        ATLAS_CHAIN,
        SUBJECT_PROJECT_NAME,
      );

      expect(neighborhood?.dependencies).toStrictEqual(["atlas-core"]);
      expect(neighborhood?.dependents).toStrictEqual(["atlas-application"]);
    });

    it("drops a project's edge to itself", () => {
      expect.hasAssertions();

      const neighborhood = service.buildNeighborhood(
        ATLAS_SELF_DEPENDENT,
        SUBJECT_PROJECT_NAME,
      );

      expect(neighborhood?.dependencies).toStrictEqual(["atlas-core"]);
    });

    it("drops an edge to a package outside the workspace", () => {
      expect.hasAssertions();

      const neighborhood = service.buildNeighborhood(
        ATLAS_EXTERNAL,
        SUBJECT_PROJECT_NAME,
      );

      expect(neighborhood?.dependencies).toStrictEqual(["atlas-core"]);
    });

    it("lets a static declaration win over an implicit one", () => {
      expect.hasAssertions();

      const neighborhood = service.buildNeighborhood(
        ATLAS_DOUBLE_DECLARED,
        "atlas-application",
      );

      expect(neighborhood?.edges).toStrictEqual([
        {
          implicit: false,
          source: "atlas-application",
          target: "atlas-service",
        },
      ]);
    });
  });

  describe("renderNeighborhood", () => {
    it("highlights the project the diagram is centered on", () => {
      expect.hasAssertions();
      expect(
        service.renderNeighborhood(ATLAS_CHAIN, SUBJECT_PROJECT_NAME),
      ).toContain("class atlas_service subject");
    });

    it("draws an inferred dependency with a dashed arrow and a legend", () => {
      expect.hasAssertions();

      const diagram = service.renderNeighborhood(
        ATLAS_INFERRED,
        "atlas-application",
      );

      expect(diagram).toContain("-.->");
      expect(diagram).toContain("Dashed edges are dependencies Nx inferred");
    });

    it("reports a project with no neighbors instead of drawing one", () => {
      expect.hasAssertions();
      expect(
        service.renderNeighborhood(ATLAS_UNCONNECTED, SUBJECT_PROJECT_NAME),
      ).toBe("_This project has no immediate Nx dependencies or dependents._");
    });
  });

  describe("renderWorkspaceGraph", () => {
    it("draws the whole chain rather than one hop", () => {
      expect.hasAssertions();

      const diagram = service.renderWorkspaceGraph(ATLAS_CHAIN);

      expect(diagram).toContain("atlas_application --> atlas_service");
      expect(diagram).toContain("atlas_service --> atlas_core");
    });

    it("highlights no project at all", () => {
      expect.hasAssertions();
      expect(service.renderWorkspaceGraph(ATLAS_CHAIN)).not.toContain(
        "classDef subject",
      );
    });
  });

  describe("build", () => {
    it("builds the scope and drift documents", () => {
      expect.hasAssertions();
      expect(service.build().map((document) => document.id)).toStrictEqual([
        "02-neighborhood-scope",
        "16-workspace-drift",
      ]);
    });
  });
});
