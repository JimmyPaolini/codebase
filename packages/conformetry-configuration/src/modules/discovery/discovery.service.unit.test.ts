import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { RenderingService } from "@jimmypaolini/conformetry-generation";
import { Test } from "@nestjs/testing";
import { beforeAll, describe, expect, it } from "vitest";

import { ConfigurationService } from "../configuration/configuration.service";

import { DiscoveryMatchingService } from "./discovery-matching.service";
import { DiscoveryMetadataService } from "./discovery-metadata.service";
import { DiscoveryTemplatesService } from "./discovery-templates.service";
import { DiscoveryService } from "./discovery.service";

import type { ConformetryConfiguration } from "../configuration/configuration.types";

/** Tests run from the package directory; templates resolve from the root. */
const WORKSPACE_ROOT = path.resolve(process.cwd(), "..", "..");

const CONFIGURATION: ConformetryConfiguration = {
  generators: {
    alpha: { name: "alpha", parameters: {}, templateDirectoryPath: "t/alpha" },
    beta: { name: "beta", parameters: {}, templateDirectoryPath: "t/beta" },
  },
};

describe(DiscoveryService, () => {
  let service: DiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        DiscoveryMatchingService,
        DiscoveryMetadataService,
        DiscoveryService,
        DiscoveryTemplatesService,
        RenderingService,
      ],
    }).compile();

    service = await module.resolve(DiscoveryService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("resolveGeneratorNames", () => {
    it("returns every configured generator when unfiltered", () => {
      expect(
        service.resolveGeneratorNames({ configuration: CONFIGURATION }),
      ).toStrictEqual(["alpha", "beta"]);
    });

    it("returns every generator for an empty filter", () => {
      expect(
        service.resolveGeneratorNames({
          configuration: CONFIGURATION,
          templateRuleNames: [],
        }),
      ).toStrictEqual(["alpha", "beta"]);
    });

    it("narrows to the requested generators", () => {
      expect(
        service.resolveGeneratorNames({
          configuration: CONFIGURATION,
          templateRuleNames: ["beta"],
        }),
      ).toStrictEqual(["beta"]);
    });

    it("ignores requested names that are not configured", () => {
      expect(
        service.resolveGeneratorNames({
          configuration: CONFIGURATION,
          templateRuleNames: ["gamma"],
        }),
      ).toStrictEqual([]);
    });
  });

  describe("prepareValidationPayload", () => {
    it("prepares documents for a real workspace project", async () => {
      const documents = await service.prepareValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        projectPaths: ["packages/conformetry-core"],
        workingDirectory: WORKSPACE_ROOT,
      });

      expect(documents.length).toBeGreaterThan(0);
      expect(
        documents.every((document) => document.filename.endsWith(".ts")),
      ).toBe(true);
    });

    it("returns nothing for a directory sharing no file with any template", async () => {
      const emptyProjectPath = await mkdtemp(
        path.join(tmpdir(), "conformetry-empty-project-"),
      );

      const documents = await service.prepareValidationPayload({
        configurationPath: "configuration/conformetry.config.ts",
        fileExtensions: [".ts"],
        projectPaths: [emptyProjectPath],
        workingDirectory: WORKSPACE_ROOT,
      });

      expect(documents).toStrictEqual([]);
    });
  });
});
