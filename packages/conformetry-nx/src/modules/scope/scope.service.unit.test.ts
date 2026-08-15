import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ScopeService } from "./scope.service";

import type { ProjectScope } from "../candidates/candidates.types";

const NESTJS: ProjectScope = {
  name: "widgets",
  root: "packages/widgets",
  tags: ["framework:nestjs", "type:package"],
};

const REACT: ProjectScope = {
  name: "storefront",
  root: "applications/storefront",
  tags: ["framework:react", "type:application"],
};

describe(ScopeService, () => {
  let service: ScopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [ScopeService],
    }).compile();

    service = await module.resolve(ScopeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readScope", () => {
    it("reads the scope a generator declares", () => {
      expect(
        service.readScope({
          name: "nestjs-service-module",
          scope: { directories: ["src/modules"], tags: ["framework:nestjs"] },
        }),
      ).toStrictEqual({
        directories: ["src/modules"],
        tags: ["framework:nestjs"],
      });
    });

    it.each([
      ["a generator declaring none", { name: "react-component" }],
      ["a malformed scope", { scope: { tags: "framework:nestjs" } }],
      ["a scope that is not an object", { scope: 7 }],
      ["a definition that is not an object", "nestjs-service-module"],
      ["nothing at all", undefined],
    ])("reads nothing from %s", (_description, definition) => {
      // Treated as absent rather than thrown on: one malformed entry must not
      // stop the project graph from building.
      expect(service.readScope(definition)).toBeUndefined();
    });
  });

  describe("matchesProject", () => {
    it("matches a project carrying one of the scope's tags", () => {
      expect(
        service.matchesProject({
          project: NESTJS,
          scope: { tags: ["framework:nestjs"] },
        }),
      ).toBe(true);
    });

    it("does not match a project carrying none of them", () => {
      expect(
        service.matchesProject({
          project: REACT,
          scope: { tags: ["framework:nestjs"] },
        }),
      ).toBe(false);
    });

    it.each([
      ["no scope", undefined],
      ["a scope with no tags", {}],
      ["a scope with an empty tag list", { tags: [] }],
    ])("matches every project given %s", (_description, scope) => {
      // Tags narrow a generator; they do not opt it in.
      expect(service.matchesProject({ project: REACT, scope })).toBe(true);
    });
  });

  describe("isInScopedDirectory", () => {
    it("admits a path inside a scoped directory", () => {
      expect(
        service.isInScopedDirectory({
          projectRoot: "packages/widgets",
          relativePath: "packages/widgets/src/modules",
          scope: { directories: ["src/modules"] },
        }),
      ).toBe(true);
    });

    it("refuses a path outside every scoped directory", () => {
      expect(
        service.isInScopedDirectory({
          projectRoot: "packages/widgets",
          relativePath: "packages/widgets/src/components",
          scope: { directories: ["src/modules"] },
        }),
      ).toBe(false);
    });

    it.each([
      ["no scope", undefined],
      ["a scope naming no directory", { tags: ["framework:nestjs"] }],
      ["a scope with an empty directory list", { directories: [] }],
    ])("admits the whole project given %s", (_description, scope) => {
      expect(
        service.isInScopedDirectory({
          projectRoot: "packages/widgets",
          relativePath: "packages/widgets/anywhere",
          scope,
        }),
      ).toBe(true);
    });
  });

  describe("resolveScopedProjectNames", () => {
    it("names the matching projects, sorted for a stable schema", () => {
      // The emitted schema is compared byte for byte by the drift check, so an
      // unstable order would report drift on every re-emit.
      expect(
        service.resolveScopedProjectNames({
          projects: [REACT, NESTJS],
          scope: { tags: ["framework:react", "framework:nestjs"] },
        }),
      ).toStrictEqual(["storefront", "widgets"]);
    });

    it("names nothing when the scope matches no project", () => {
      expect(
        service.resolveScopedProjectNames({
          projects: [REACT],
          scope: { tags: ["framework:nestjs"] },
        }),
      ).toStrictEqual([]);
    });
  });
});
