import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryScopeService } from "./discovery-scope.service";

import type { WorkspaceProject } from "./discovery.types";
import type { ConformetryConfiguration } from "@jimmypaolini/conformetry-configuration";

const CONFIGURATION: ConformetryConfiguration = {
  generators: {
    "nestjs-command-project": {
      name: "nestjs-command-project",
      parameters: {},
      templateDirectoryPath: "t/command-project",
    },
    "nestjs-service-module": {
      name: "nestjs-service-module",
      parameters: {},
      templateDirectoryPath: "t/service-module",
    },
    "nestjs-service-project": {
      name: "nestjs-service-project",
      parameters: {},
      templateDirectoryPath: "t/service-project",
    },
  },
};

function createProject(tags: string[]): WorkspaceProject {
  return { name: "example", rootPath: "packages/example", tags };
}

describe(DiscoveryScopeService, () => {
  let service: DiscoveryScopeService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryScopeService],
    }).compile();

    service = await module.resolve(DiscoveryScopeService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("readScopeKind", () => {
    it("treats a *-module generator as module scope", () => {
      expect(service.readScopeKind("nestjs-service-module")).toBe("module");
    });

    it("treats everything else as project scope", () => {
      expect(service.readScopeKind("nestjs-service-project")).toBe("project");
    });
  });

  describe("resolveScopedPaths", () => {
    it("validates a project root only when the project declares its generator", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );

      expect(
        service
          .resolveScopedPaths({
            configuration: CONFIGURATION,
            project: createProject(["generator:nestjs-service-project"]),
            workingDirectory,
          })
          .map((scopedPath) => scopedPath.generatorNames),
      ).toStrictEqual([["nestjs-service-project"]]);
    });

    it("never guesses a project template for an untagged project", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );

      expect(
        service.resolveScopedPaths({
          configuration: CONFIGURATION,
          project: createProject(["framework:react", "language:typescript"]),
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });

    it("ignores a generator tag naming something not configured", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );

      expect(
        service.resolveScopedPaths({
          configuration: CONFIGURATION,
          project: createProject(["generator:does-not-exist"]),
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });

    it("matches a module directory by its marker files, without any tag", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );
      const modulePath = path.join(
        workingDirectory,
        "packages/example/src/modules/widget",
      );

      await mkdir(modulePath, { recursive: true });
      await writeFile(path.join(modulePath, "widget.module.ts"), "", "utf8");
      await writeFile(path.join(modulePath, "widget.service.ts"), "", "utf8");

      expect(
        service
          .resolveScopedPaths({
            configuration: CONFIGURATION,
            project: createProject([]),
            workingDirectory,
          })
          .map((scopedPath) => scopedPath.generatorNames),
      ).toStrictEqual([["nestjs-service-module"]]);
    });

    it("skips a module directory whose marker files belong to another generator", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );
      const modulePath = path.join(
        workingDirectory,
        "packages/example/src/modules/widget",
      );

      await mkdir(modulePath, { recursive: true });
      await writeFile(path.join(modulePath, "widget.module.ts"), "", "utf8");
      await writeFile(path.join(modulePath, "widget.service.ts"), "", "utf8");
      await writeFile(path.join(modulePath, "widget.resolver.ts"), "", "utf8");

      expect(
        service.resolveScopedPaths({
          configuration: CONFIGURATION,
          project: createProject([]),
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });

    it("never validates the logger module, which every project shares", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-scope-"),
      );
      const modulePath = path.join(
        workingDirectory,
        "packages/example/src/modules/logger",
      );

      await mkdir(modulePath, { recursive: true });
      await writeFile(path.join(modulePath, "logger.module.ts"), "", "utf8");
      await writeFile(path.join(modulePath, "logger.service.ts"), "", "utf8");

      expect(
        service.resolveScopedPaths({
          configuration: CONFIGURATION,
          project: createProject([]),
          workingDirectory,
        }),
      ).toStrictEqual([]);
    });
  });
});
