import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryMetadataService } from "./discovery-metadata.service";

describe(DiscoveryMetadataService, () => {
  let service: DiscoveryMetadataService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [DiscoveryMetadataService, RenderingService],
    }).compile();

    service = await module.resolve(DiscoveryMetadataService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("parseProjectMetadata", () => {
    it("reads sourceRoot and tags", () => {
      expect(
        service.parseProjectMetadata(
          JSON.stringify({ sourceRoot: "packages/x", tags: ["a", "b"] }),
        ),
      ).toStrictEqual({ sourceRoot: "packages/x", tags: ["a", "b"] });
    });

    it("returns undefined for malformed JSON rather than throwing", () => {
      expect(service.parseProjectMetadata("{not json")).toBeUndefined();
    });

    it("drops a tags array that is not all strings", () => {
      expect(
        service.parseProjectMetadata(JSON.stringify({ tags: ["a", 1] })),
      ).toStrictEqual({});
    });
  });

  describe("resolveGeneratorNameFromTags", () => {
    it("extracts the generator name", () => {
      expect(
        service.resolveGeneratorNameFromTags([
          "language:typescript",
          "generator:nestjs-service-project",
        ]),
      ).toBe("nestjs-service-project");
    });

    it("ignores an empty generator tag", () => {
      expect(
        service.resolveGeneratorNameFromTags(["generator:  "]),
      ).toBeUndefined();
    });

    it("returns undefined when there are no tags", () => {
      expect(service.resolveGeneratorNameFromTags(undefined)).toBeUndefined();
    });
  });

  describe("resolveSourceRootType", () => {
    it("reads the leading path segment", () => {
      expect(service.resolveSourceRootType("packages/example")).toBe(
        "packages",
      );
    });

    it("returns undefined when unset", () => {
      expect(service.resolveSourceRootType(undefined)).toBeUndefined();
    });
  });

  describe("resolveProjectType", () => {
    it("prefers declared metadata", () => {
      expect(
        service.resolveProjectType({
          projectMetadata: { type: "tools" },
          projectPath: "/w/packages/x",
          workingDirectory: "/w",
        }),
      ).toBe("tools");
    });

    it("falls back to the top-level workspace folder", () => {
      expect(
        service.resolveProjectType({
          projectMetadata: {},
          projectPath: path.join("/w", "packages", "x"),
          workingDirectory: "/w",
        }),
      ).toBe("packages");
    });
  });

  describe("readProjectMetadata", () => {
    it("reads the generator tag and source-root type", async () => {
      const projectPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-meta-"),
      );

      await writeFile(
        path.join(projectPath, "project.json"),
        JSON.stringify({
          sourceRoot: "packages/example",
          tags: ["generator:nestjs-service-project"],
        }),
        "utf8",
      );

      expect(service.readProjectMetadata(projectPath)).toStrictEqual({
        description: "",
        generatorName: "nestjs-service-project",
        type: "packages",
      });
    });

    it("tolerates a project with no metadata file", async () => {
      const projectPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-meta-"),
      );

      expect(service.readProjectMetadata(projectPath)).toStrictEqual({
        description: "",
      });
    });
  });

  describe("readProjectDescription", () => {
    it("reads a description from pyproject.toml", async () => {
      const projectPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-meta-"),
      );

      await writeFile(
        path.join(projectPath, "pyproject.toml"),
        'description = "A python project"\n',
        "utf8",
      );

      expect(service.readProjectDescription(projectPath)).toBe(
        "A python project",
      );
    });
  });

  describe("buildSubstitutions", () => {
    it("derives name variants and the project type", () => {
      expect(
        service.buildSubstitutions({
          projectMetadata: { description: "desc", type: "packages" },
          projectPath: path.join("/w", "packages", "my-widget"),
          workingDirectory: "/w",
        }),
      ).toStrictEqual({
        description: "desc",
        name: "my-widget",
        nameCamelCase: "myWidget",
        nameKebabCase: "my-widget",
        namePascalCase: "MyWidget",
        nameSnakeCase: "my_widget",
        type: "packages",
      });
    });
  });
});
