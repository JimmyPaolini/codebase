import {
  ConfigurationService,
  TemplateDiscoveryMatchingService,
  TemplateDiscoveryService,
} from "@conformetry/configuration";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { InventoryService } from "./inventory.service";

import type {
  ConformetryConfiguration,
  Instance,
  TemplateDefinition,
} from "@conformetry/configuration";
import type { DeepMocked } from "@golevelup/ts-vitest";

const CONFIGURATION: ConformetryConfiguration = [
  {
    aliases: ["ncm"],
    description: "Generate a NestJS command module",
    inputs: {},
    instances: [{ patterns: ["packages/*/src/modules/*"] }],
    name: "command-module",
    templatePath: "configuration/templates/command-module",
  },
  {
    inputs: {},
    instances: [],
    name: "service-module",
    templatePath: "configuration/templates/service-module",
  },
];

const COMMAND_TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/command-module",
  filePaths: ["/w/a.ts", "/w/b.ts", "/w/c.ts", "/w/d.ts"],
  name: "command-module",
};

const SERVICE_TEMPLATE: TemplateDefinition = {
  directoryPath: "/w/configuration/templates/service-module",
  filePaths: ["/w/a.ts", "/w/b.ts"],
  name: "service-module",
};

const INSTANCE: Instance = {
  nameStem: "gears",
  path: "/w/packages/widgets/src/modules",
};

describe(InventoryService, () => {
  let service: InventoryService;
  let configurationService: DeepMocked<ConfigurationService>;
  let matchingService: DeepMocked<TemplateDiscoveryMatchingService>;
  let discoveryService: DeepMocked<TemplateDiscoveryService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: ConfigurationService,
          useValue: createMock<ConfigurationService>(),
        },
        {
          provide: TemplateDiscoveryMatchingService,
          useValue: createMock<TemplateDiscoveryMatchingService>(),
        },
        {
          provide: TemplateDiscoveryService,
          useValue: createMock<TemplateDiscoveryService>(),
        },
      ],
    }).compile();

    service = await module.resolve(InventoryService);
    configurationService = await module.resolve(ConfigurationService);
    matchingService = await module.resolve(TemplateDiscoveryMatchingService);
    discoveryService = await module.resolve(TemplateDiscoveryService);
  });

  // The shared setup clears every mock before each test, so the return values
  // are re-applied here rather than alongside the module.
  beforeEach(() => {
    configurationService.loadConformetryConfiguration.mockResolvedValue(
      CONFIGURATION,
    );
    discoveryService.collectTemplates.mockReturnValue([
      COMMAND_TEMPLATE,
      SERVICE_TEMPLATE,
    ]);
    discoveryService.findInstances.mockReturnValue([INSTANCE]);
    matchingService.buildSubstitutions.mockReturnValue({});
    matchingService.matchTemplates.mockReturnValue([
      { matchedFileCount: 4, matchRatio: 1, template: COMMAND_TEMPLATE },
      { matchedFileCount: 1, matchRatio: 0.5, template: SERVICE_TEMPLATE },
    ]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("formatPercentage", () => {
    it("renders a ratio as a whole-number percentage", () => {
      expect(service.formatPercentage(1)).toBe("100%");
      expect(service.formatPercentage(0.6)).toBe("60%");
    });
  });

  describe("resolveTemplates", () => {
    it("pairs each declared template with the instances it explains", async () => {
      const templates = await service.resolveTemplates({
        configurationPath: "c.ts",
        workingDirectory: "/w",
      });

      expect(templates.map((template) => template.name)).toStrictEqual([
        "command-module",
        "service-module",
      ]);
      expect(templates[0]?.instances[0]?.name).toBe(
        "packages/widgets/src/modules/gears",
      );
    });

    it("carries aliases and description through, defaulting both", async () => {
      const [first, second] = await service.resolveTemplates({
        configurationPath: "c.ts",
        workingDirectory: "/w",
      });

      expect(first?.aliases).toStrictEqual(["ncm"]);
      expect(second?.aliases).toStrictEqual([]);
      expect(second?.description).toBe("");
    });

    // Narrowing by path is what turns this into "which templates explain this",
    // so a template explaining none of the named paths drops out.
    it("drops templates that explain none of the named paths", async () => {
      matchingService.matchTemplates.mockReturnValue([
        { matchedFileCount: 4, matchRatio: 1, template: COMMAND_TEMPLATE },
      ]);

      const templates = await service.resolveTemplates({
        configurationPath: "c.ts",
        instancePatterns: ["packages/widgets/src/modules/gears"],
        workingDirectory: "/w",
      });

      expect(templates.map((template) => template.name)).toStrictEqual([
        "command-module",
      ]);
    });

    it("uses the caller's globs in place of the configured ones", async () => {
      await service.resolveTemplates({
        configurationPath: "c.ts",
        instancePatterns: ["tools/*"],
        workingDirectory: "/w",
      });

      expect(discoveryService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["tools/*"] }),
      );
    });

    it("expands the configured globs when the caller names none", async () => {
      await service.resolveTemplates({
        configurationPath: "c.ts",
        workingDirectory: "/w",
      });

      expect(discoveryService.findInstances).toHaveBeenCalledWith(
        expect.objectContaining({ patterns: ["packages/*/src/modules/*"] }),
      );
    });
  });

  describe("resolveInstances", () => {
    // Nothing records where an instance came from, so a path legitimately
    // belongs to more than one template.
    it("pairs each instance with every template that explains it", async () => {
      const instances = await service.resolveInstances({
        configurationPath: "c.ts",
        workingDirectory: "/w",
      });

      expect(instances[0]?.path).toBe("packages/widgets/src/modules/gears");
      expect(instances[0]?.templates.map((entry) => entry.name)).toStrictEqual([
        "command-module",
        "service-module",
      ]);
    });

    it("narrows the pairing to the named templates", async () => {
      const instances = await service.resolveInstances({
        configurationPath: "c.ts",
        templateNames: ["service-module"],
        workingDirectory: "/w",
      });

      expect(instances[0]?.templates.map((entry) => entry.name)).toStrictEqual([
        "service-module",
      ]);
    });

    it("drops an instance no named template explains", async () => {
      const instances = await service.resolveInstances({
        configurationPath: "c.ts",
        templateNames: ["react-component"],
        workingDirectory: "/w",
      });

      expect(instances).toStrictEqual([]);
    });

    it("reports paths relative to the working directory", async () => {
      const instances = await service.resolveInstances({
        configurationPath: "c.ts",
        workingDirectory: "/w",
      });

      expect(instances[0]?.path.startsWith("/")).toBe(false);
    });
  });
});
