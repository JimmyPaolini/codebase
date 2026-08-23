import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CodometerTargetsService } from "./codometer-targets.service";

import type {
  PackageManifest,
  ProjectManifest,
} from "./codometer-targets.types";

/** Paths the mocked workspace says exist. */
const existingPaths = new Set<string>();

/** Directory names the mocked workspace returns for a read, by scope path. */
const scopeChildren = new Map<string, string[]>();

/** Names the mocked workspace treats as files rather than directories. */
const fileNames = new Set<string>();

/** What the mocked workspace hands back for a manifest read, by path. */
const manifestDocuments = new Map<string, string>();

vi.mock("node:fs", () => ({
  existsSync: vi.fn<(target: string) => boolean>((target: string) =>
    existingPaths.has(target),
  ),
  readdirSync: vi.fn<
    (target: string) => { isDirectory: () => boolean; name: string }[]
  >((target: string) =>
    (scopeChildren.get(target) ?? []).map((name) => ({
      isDirectory: () => !fileNames.has(name),
      name,
    })),
  ),
  readFileSync: vi.fn<(target: string) => string>(
    (target: string) => manifestDocuments.get(target) ?? "{}",
  ),
}));

describe(CodometerTargetsService, () => {
  let service: CodometerTargetsService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CodometerTargetsService],
    }).compile();

    service = await module.resolve(CodometerTargetsService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    existingPaths.clear();
    scopeChildren.clear();
    fileNames.clear();
    manifestDocuments.clear();
  });

  it("is defined", () => {
    expect.hasAssertions();
    expect(service).toBeDefined();
  });

  describe("resolveWorkspaceProjects", () => {
    it("names every project manifest under every workspace scope", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      existingPaths.add("/workspace/packages/logger/project.json");
      scopeChildren.set("/workspace/packages", ["logger", "notes"]);

      expect(service.resolveWorkspaceProjects("/workspace")).toStrictEqual([
        {
          directory: "/workspace/packages/logger",
          packageManifestPath: "/workspace/packages/logger/package.json",
          projectManifestPath: "/workspace/packages/logger/project.json",
        },
      ]);
    });

    it("skips a scope child that is not a directory", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/tools");
      existingPaths.add("/workspace/tools/README.md/project.json");
      scopeChildren.set("/workspace/tools", ["README.md"]);
      fileNames.add("README.md");

      expect(service.resolveWorkspaceProjects("/workspace")).toStrictEqual([]);
    });

    it("skips a scope child with no project manifest", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages");
      scopeChildren.set("/workspace/packages", ["scratch"]);

      expect(service.resolveWorkspaceProjects("/workspace")).toStrictEqual([]);
    });
  });

  describe("readProjectManifest", () => {
    it("parses the manifest it read", () => {
      expect.hasAssertions();

      manifestDocuments.set(
        "/workspace/project.json",
        '{"targets":{"codometer":{}}}',
      );

      expect(
        service.readProjectManifest("/workspace/project.json"),
      ).toStrictEqual({ targets: { codometer: {} } });
    });
  });

  describe("readPackageManifest", () => {
    it("returns undefined when the manifest is absent", () => {
      expect.hasAssertions();
      expect(
        service.readPackageManifest("/workspace/package.json"),
      ).toBeUndefined();
    });

    it("parses the manifest it read", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/package.json");
      manifestDocuments.set("/workspace/package.json", '{"sizeLimit":"1 KB"}');

      expect(
        service.readPackageManifest("/workspace/package.json"),
      ).toStrictEqual({ sizeLimit: "1 KB" });
    });
  });

  describe("declaresCodometerTarget", () => {
    it("is true when the target is declared", () => {
      expect.hasAssertions();

      const projectManifest: ProjectManifest = { targets: { codometer: {} } };

      expect(service.declaresCodometerTarget(projectManifest)).toBe(true);
    });

    it("is false when the target is absent", () => {
      expect.hasAssertions();

      const projectManifest: ProjectManifest = { targets: { knip: {} } };

      expect(service.declaresCodometerTarget(projectManifest)).toBe(false);
    });

    it("is false when no targets are declared at all", () => {
      expect.hasAssertions();
      expect(service.declaresCodometerTarget({})).toBe(false);
    });
  });

  describe("declaresSizeLimit", () => {
    it("is true when the package manifest declares a sizeLimit", () => {
      expect.hasAssertions();

      const packageManifest: PackageManifest = { sizeLimit: "1 KB" };

      expect(
        service.declaresSizeLimit(
          "/workspace/packages/logger",
          packageManifest,
        ),
      ).toBe(true);
    });

    it("is true when a codometer config file exists instead", () => {
      expect.hasAssertions();

      existingPaths.add("/workspace/packages/lexico/codometer.config.cjs");

      expect(
        service.declaresSizeLimit("/workspace/packages/lexico", undefined),
      ).toBe(true);
    });

    it("is false when neither a sizeLimit nor a config file exists", () => {
      expect.hasAssertions();
      expect(service.declaresSizeLimit("/workspace/packages/logger", {})).toBe(
        false,
      );
    });

    it("is false when the package manifest is absent and no config file exists", () => {
      expect.hasAssertions();
      expect(
        service.declaresSizeLimit("/workspace/packages/logger", undefined),
      ).toBe(false);
    });
  });
});
