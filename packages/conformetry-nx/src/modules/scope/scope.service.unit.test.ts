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
          scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
        }),
      ).toStrictEqual({
        patterns: ["src/modules/*"],
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

  describe("deriveInstanceGroups", () => {
    it("derives a workspace-relative glob per scope pattern", () => {
      expect(
        service.deriveInstanceGroups({
          project: NESTJS,
          scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
        }),
      ).toStrictEqual([
        {
          patterns: ["packages/widgets/src/modules/*"],
          substitutions: { type: "packages" },
        },
      ]);
    });

    it("derives the project itself for the root pattern", () => {
      expect(
        service.deriveInstanceGroups({
          project: NESTJS,
          scope: { patterns: ["."], tags: ["framework:nestjs"] },
        })[0]?.patterns,
      ).toStrictEqual(["packages/widgets"]);
    });

    it("derives nothing for a project the scope does not match", () => {
      expect(
        service.deriveInstanceGroups({
          project: REACT,
          scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
        }),
      ).toStrictEqual([]);
    });

    it("derives nothing from a scope naming no pattern", () => {
      // Tags alone confine the prompt without claiming anything is validated.
      expect(
        service.deriveInstanceGroups({
          project: REACT,
          scope: { tags: ["framework:react"] },
        }),
      ).toStrictEqual([]);
    });
  });

  describe("resolveScopedDirectory", () => {
    it.each([
      ["src/modules/*", "src/modules"],
      ["src/modules/*/*.service.ts", "src/modules"],
      ["src/components", "src/components"],
    ])("trims %s to %s", (pattern, expected) => {
      expect(service.resolveScopedDirectory({ patterns: [pattern] })).toBe(
        expected,
      );
    });

    it.each([
      ["the root pattern", { patterns: ["."] }],
      ["a pattern that is all glob", { patterns: ["*"] }],
      ["a scope naming no pattern", { tags: ["framework:nestjs"] }],
      ["no scope", undefined],
    ])("names no directory for %s", (_description, scope) => {
      expect(service.resolveScopedDirectory(scope)).toBeUndefined();
    });
  });

  describe("assertScopeAndInstancesExclusive", () => {
    it("refuses a generator declaring both", () => {
      expect(() => {
        service.assertScopeAndInstancesExclusive({
          inputs: {},
          instances: [{ patterns: ["packages/*/src/modules/*"] }],
          name: "nestjs-service-module",
          scope: { tags: ["framework:nestjs"] },
          templatePath: "templates/module",
        });
      }).toThrow("declares both a scope and instances");
    });

    it.each([
      [
        "a scope alone",
        {
          instances: [],
          scope: { patterns: ["src/modules/*"], tags: ["framework:nestjs"] },
        },
      ],
      [
        "instances alone",
        { instances: [{ patterns: ["packages/*/src/modules/*"] }] },
      ],
      ["neither", { instances: [] }],
    ])("allows %s", (_description, fields) => {
      expect(() => {
        service.assertScopeAndInstancesExclusive({
          inputs: {},
          name: "nestjs-service-module",
          templatePath: "templates/module",
          ...fields,
        });
      }).not.toThrow();
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
