import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomStatisticsService } from "../custom-statistics/custom-statistics.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { LanguagesService } from "../languages/languages.service";

import { CodometerService } from "./codometer.service";

import type { DiscoveryResult } from "../discovery/discovery.types";
import type { LanguageResults } from "../languages/languages.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const configuration: ResolvedCodometerConfiguration = {
  exclude: ["**/node_modules/**"],
  excludeFrom: [],
  output: { json: undefined, markdown: undefined },
  python: { command: "uv run python" },
  statistics: [
    { color: "7c3aed", label: "Service Files", patterns: ["**/*.service.ts"] },
  ],
};

const discoveredFiles: DiscoveryResult = {
  cssFiles: ["src/styles.css"],
  hclFiles: ["infrastructure/main.tf"],
  jsFiles: ["src/app.js"],
  jsonFiles: [],
  markdownFiles: ["docs/guide.md"],
  notebookFiles: ["notebooks/explore.ipynb"],
  pyFiles: ["scripts/check.py"],
  shellFiles: ["scripts/setup.sh"],
  sourceFiles: ["src/app.ts", "scripts/check.py"],
  sqlFiles: ["data/schema.sql"],
  testFiles: [],
  tomlFiles: ["pyproject.toml"],
  trackedFiles: ["src/app.ts", "scripts/check.py"],
  tsFiles: ["src/app.ts"],
  yamlFiles: [".github/workflows/ci.yml"],
};

/** Builds a language report carrying the counters these assertions read. */
function buildLanguageResults(): LanguageResults {
  return createMock<LanguageResults>({
    jupyter: createMock<LanguageResults["jupyter"]>({
      cells: 7,
      codeCells: 6,
      codeLines: 40,
    }),
    python: createMock<LanguageResults["python"]>({ files: 1, lines: 11 }),
    typescript: createMock<LanguageResults["typescript"]>({
      classes: 10,
      externalPackages: new Set(["react"]),
      jsFiles: 1,
      lines: 19,
      tsFiles: 1,
    }),
  });
}

describe(CodometerService, () => {
  let service: CodometerService;
  let customStatisticsService: CustomStatisticsService;
  let discoveryService: DiscoveryService;
  let languagesService: LanguagesService;

  /** Builds an aggregator whose collaborators are all mocked. */
  function buildService(): CodometerService {
    return new CodometerService(
      discoveryService,
      languagesService,
      customStatisticsService,
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CodometerService,
        {
          provide: CustomStatisticsService,
          useValue: createMock<CustomStatisticsService>(),
        },
        { provide: DiscoveryService, useValue: createMock<DiscoveryService>() },
        { provide: LanguagesService, useValue: createMock<LanguagesService>() },
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    customStatisticsService = createMock<CustomStatisticsService>();
    discoveryService = createMock<DiscoveryService>();
    languagesService = createMock<LanguagesService>();
    vi.mocked(discoveryService.discoverFiles).mockReturnValue(discoveredFiles);
    vi.mocked(languagesService.analyze).mockReturnValue(buildLanguageResults());
    vi.mocked(customStatisticsService.analyze).mockReturnValue([
      { color: "7c3aed", files: 3, label: "Service Files" },
    ]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("passes the configured exclusions to discovery", () => {
    buildService().measure({ configuration, workingDirectory: "/repo" });

    expect(discoveryService.discoverFiles).toHaveBeenCalledExactlyOnceWith({
      exclude: ["**/node_modules/**"],
      excludeFrom: [],
      workingDirectory: "/repo",
    });
  });

  it("hands the discovered files to every language analyzer at once", () => {
    buildService().measure({ configuration, workingDirectory: "/repo" });

    expect(languagesService.analyze).toHaveBeenCalledExactlyOnceWith({
      configuration,
      discoveredFiles,
      workingDirectory: "/repo",
    });
  });

  it("counts the configured conventions over the tracked files", () => {
    const result = buildService().measure({
      configuration,
      workingDirectory: "/repo",
    });

    expect(customStatisticsService.analyze).toHaveBeenCalledExactlyOnceWith({
      statistics: configuration.statistics,
      trackedFiles: discoveredFiles.trackedFiles,
    });
    expect(result.custom).toStrictEqual([
      { color: "7c3aed", files: 3, label: "Service Files" },
    ]);
  });

  it("projects the TypeScript analyzer onto both language groups", () => {
    const result = buildService().measure({
      configuration,
      workingDirectory: "/repo",
    });

    expect(result.typescript.files).toBe(1);
    expect(result.javascript.files).toBe(1);
    expect(result.javascript.classes).toBe(10);
    // The analyzer reports a set; the report carries how many are in it.
    expect(result.javascript.externalPackages).toBe(1);
  });

  it("counts notebook code toward the repository total exactly once", () => {
    const result = buildService().measure({
      configuration,
      workingDirectory: "/repo",
    });

    // 19 TypeScript lines, 11 Python lines, 40 lines inside notebook cells.
    expect(result.linesOfCode).toBe(70);
    expect(result.sourceFiles).toBe(3);
  });
});
