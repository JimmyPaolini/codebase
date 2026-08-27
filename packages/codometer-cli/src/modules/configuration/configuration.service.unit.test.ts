import { ConfigurationService as CodometerConfigurationService } from "@codometer/configuration";
import { DiscoveryService } from "@codometer/discovery";
import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ConfigurationService } from "./configuration.service";

import type {
  LoadedConfiguration,
  ResolvedCodometerConfiguration,
} from "@codometer/configuration";
import type { DiscoveryResult } from "@codometer/discovery";

/** A resolved configuration with only the fields these tests read filled in. */
function buildConfiguration(
  overrides: Partial<ResolvedCodometerConfiguration> = {},
): ResolvedCodometerConfiguration {
  return {
    defaultTarget: undefined,
    documentation: undefined,
    exclude: [],
    excludeFrom: [],
    limits: [],
    output: { json: undefined, markdown: undefined },
    python: { command: "python" },
    statistics: [],
    targets: [],
    ...overrides,
  };
}

/** A discovery result holding the given files and nothing categorized. */
function buildDiscovery(files: string[]): DiscoveryResult {
  return {
    cssFiles: [],
    files,
    hclFiles: [],
    jsFiles: [],
    jsonFiles: [],
    markdownFiles: [],
    notebookFiles: [],
    pyFiles: [],
    shellFiles: [],
    sourceFiles: [],
    sqlFiles: [],
    testFiles: [],
    tomlFiles: [],
    tsFiles: [],
    yamlFiles: [],
  };
}

describe(ConfigurationService, () => {
  let service: ConfigurationService;
  let codometerConfigurationService: CodometerConfigurationService;
  let discoveryService: DiscoveryService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ConfigurationService,
        {
          provide: CodometerConfigurationService,
          useValue: createMock<CodometerConfigurationService>(),
        },
        {
          provide: DiscoveryService,
          useValue: createMock<DiscoveryService>(),
        },
      ],
    }).compile();

    service = await module.resolve(ConfigurationService);
    codometerConfigurationService = module.get(CodometerConfigurationService);
    discoveryService = module.get(DiscoveryService);
  });

  beforeEach(() => {
    vi.mocked(codometerConfigurationService.loadConfigurationFile).mockReset();
    vi.mocked(discoveryService.discoverFiles).mockReset();
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("findConfigurationFiles", () => {
    it("keeps only files named like a configuration, in every supported format", async () => {
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockResolvedValue({
        configuration: buildConfiguration(),
        path: undefined,
      });
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([
          "packages/one/codometer.config.ts",
          "packages/two/codometer.config.cjs",
          "packages/three/codometer.config.json",
          "packages/four/codometer.config.txt",
          "packages/five/index.ts",
        ]),
      );

      await expect(
        service.findConfigurationFiles("/repository"),
      ).resolves.toStrictEqual([
        "packages/one/codometer.config.ts",
        "packages/three/codometer.config.json",
        "packages/two/codometer.config.cjs",
      ]);
    });

    it("walks with the exclusions the root configuration declares", async () => {
      vi.mocked(
        codometerConfigurationService.loadConfigurationFile,
      ).mockResolvedValue({
        configuration: buildConfiguration({
          exclude: ["templates/**"],
          excludeFrom: [".codometerignore"],
        }),
        path: undefined,
      });
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery([]),
      );

      await service.findConfigurationFiles("/repository");

      expect(discoveryService.discoverFiles).toHaveBeenCalledWith({
        exclude: ["templates/**"],
        excludeFrom: [".codometerignore"],
        workingDirectory: "/repository",
      });
    });
  });

  describe("describeConfigurations", () => {
    it("reports a file that cannot be loaded rather than failing the listing", async () => {
      vi.mocked(discoveryService.discoverFiles).mockReturnValue(
        buildDiscovery(["packages/broken/codometer.config.ts"]),
      );
      vi.mocked(codometerConfigurationService.loadConfigurationFile)
        .mockResolvedValueOnce({
          configuration: buildConfiguration(),
          path: undefined,
        } satisfies LoadedConfiguration)
        .mockRejectedValueOnce(new Error("Cannot find module"));

      const described = await service.describeConfigurations("/repository");

      expect(described).toStrictEqual([
        {
          configuration: undefined,
          directory: "packages/broken",
          error: "Cannot find module",
          path: "packages/broken/codometer.config.ts",
        },
      ]);
    });
  });

  describe("toLimitRows", () => {
    it("renders a size limit as bytes and a count limit as a count", () => {
      const rows = service.toLimitRows([
        {
          configuration: buildConfiguration({
            limits: [
              {
                label: undefined,
                metric: "Compiled JavaScript.size",
                severity: "fail",
                value: 6000,
              },
              {
                label: "Lines",
                metric: "codebase.linesOfCode",
                severity: "warn",
                value: 20,
              },
            ],
          }),
          directory: "packages/logger",
          error: undefined,
          path: "packages/logger/codometer.config.ts",
        },
      ]);

      expect(rows.map((row) => [row.label, row.value])).toStrictEqual([
        ["—", "6.00 kB"],
        ["Lines", "20"],
      ]);
    });

    it("contributes no rows for a configuration that failed to load", () => {
      expect(
        service.toLimitRows([
          {
            configuration: undefined,
            directory: "packages/broken",
            error: "Cannot find module",
            path: "packages/broken/codometer.config.ts",
          },
        ]),
      ).toStrictEqual([]);
    });
  });
});
