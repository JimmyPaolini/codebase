import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryMetadataService } from "./discovery-metadata.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";

import type { ConformetryConfiguration } from "../configuration/configuration.types";
import type { MatchedGeneratorCandidate } from "./discovery.types";

function createCandidate(
  overrides: Partial<MatchedGeneratorCandidate>,
): MatchedGeneratorCandidate {
  return {
    absoluteTemplateDirectoryPath: "/templates",
    existingFileCount: 0,
    generatorName: "example",
    substitutions: {},
    templateFilePaths: [],
    ...overrides,
  };
}

describe(DiscoveryMatchingService, () => {
  let service: DiscoveryMatchingService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DiscoveryMatchingService,
        DiscoveryMetadataService,
        DiscoveryTemplatesService,
        RenderingService,
      ],
    }).compile();

    service = await module.resolve(DiscoveryMatchingService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("compareCandidates", () => {
    it("ranks an explicitly tagged generator first", () => {
      const result = service.compareCandidates({
        inferredGeneratorNames: new Set(["beta"]),
        leftCandidate: createCandidate({ generatorName: "alpha" }),
        projectMetadata: { generatorName: "alpha" },
        rightCandidate: createCandidate({
          existingFileCount: 99,
          generatorName: "beta",
        }),
      });

      expect(result).toBeLessThan(0);
    });

    it("ranks an inferred name above a higher file count", () => {
      const result = service.compareCandidates({
        inferredGeneratorNames: new Set(["alpha"]),
        leftCandidate: createCandidate({ generatorName: "alpha" }),
        projectMetadata: {},
        rightCandidate: createCandidate({
          existingFileCount: 99,
          generatorName: "beta",
        }),
      });

      expect(result).toBeLessThan(0);
    });

    it("falls back to the higher existing file count", () => {
      const result = service.compareCandidates({
        inferredGeneratorNames: new Set(),
        leftCandidate: createCandidate({
          existingFileCount: 1,
          generatorName: "alpha",
        }),
        projectMetadata: {},
        rightCandidate: createCandidate({
          existingFileCount: 5,
          generatorName: "beta",
        }),
      });

      expect(result).toBeGreaterThan(0);
    });

    it("breaks ties by name so ordering is deterministic", () => {
      const result = service.compareCandidates({
        inferredGeneratorNames: new Set(),
        leftCandidate: createCandidate({ generatorName: "alpha" }),
        projectMetadata: {},
        rightCandidate: createCandidate({ generatorName: "beta" }),
      });

      expect(result).toBeLessThan(0);
    });
  });

  describe("inferGeneratorNames", () => {
    it("matches a generator name contained in the directory name", () => {
      expect(
        service.inferGeneratorNames({
          generatorNames: ["react-component", "nestjs-service-module"],
          projectPath: "/w/packages/my-react-component-kit",
        }),
      ).toStrictEqual(new Set(["react-component"]));
    });
  });

  describe("resolveBestCandidate", () => {
    it("picks the generator whose template files the project already has", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-workspace-"),
      );
      const matchingTemplate = path.join(
        workingDirectory,
        "templates",
        "match",
      );
      const otherTemplate = path.join(workingDirectory, "templates", "other");
      const projectPath = path.join(workingDirectory, "packages", "widget");

      await mkdir(matchingTemplate, { recursive: true });
      await mkdir(otherTemplate, { recursive: true });
      await mkdir(projectPath, { recursive: true });
      await writeFile(path.join(matchingTemplate, "README.md"), "# x", "utf8");
      await writeFile(path.join(otherTemplate, "OTHER.md"), "# y", "utf8");
      await writeFile(path.join(projectPath, "README.md"), "# x", "utf8");

      const configuration: ConformetryConfiguration = {
        generators: {
          match: {
            name: "match",
            parameters: {},
            templateDirectoryPath: path.relative(
              workingDirectory,
              matchingTemplate,
            ),
          },
          other: {
            name: "other",
            parameters: {},
            templateDirectoryPath: path.relative(
              workingDirectory,
              otherTemplate,
            ),
          },
        },
      };

      const candidate = service.resolveBestCandidate({
        configuration,
        generatorNames: ["match", "other"],
        projectPath,
        workingDirectory,
      });

      expect(candidate?.generatorName).toBe("match");
    });

    it("returns nothing when no template file exists in the project", async () => {
      const workingDirectory = await mkdtemp(
        path.join(tmpdir(), "conformetry-workspace-"),
      );
      const templatePath = path.join(workingDirectory, "templates", "match");
      const projectPath = path.join(workingDirectory, "packages", "widget");

      await mkdir(templatePath, { recursive: true });
      await mkdir(projectPath, { recursive: true });
      await writeFile(path.join(templatePath, "README.md"), "# x", "utf8");

      expect(
        service.resolveBestCandidate({
          configuration: {
            generators: {
              match: {
                name: "match",
                parameters: {},
                templateDirectoryPath: path.relative(
                  workingDirectory,
                  templatePath,
                ),
              },
            },
          },
          generatorNames: ["match"],
          projectPath,
          workingDirectory,
        }),
      ).toBeUndefined();
    });
  });
});
