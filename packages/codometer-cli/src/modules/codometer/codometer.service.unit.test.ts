import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomStatisticsService } from "../custom-statistics/custom-statistics.service";
import { FileDiscoveryService } from "../file-discovery/file-discovery.service";
import { LanguagesService } from "../languages/languages.service";

import { CodometerService } from "./codometer.service";

import type { FileDiscoveryResult } from "../file-discovery/file-discovery.types";
import type { LanguageResults } from "../languages/languages.types";
import type { ResolvedCodometerConfiguration } from "@codometer/configuration";

const configuration: ResolvedCodometerConfiguration = {
  exclude: ["**/node_modules/**"],
  excludeFrom: [],
  output: { json: undefined, markdown: undefined },
  python: { command: "uv run python" },
  statistics: [
    {
      color: "7c3aed",
      group: "conventions",
      label: "Service Files",
      patterns: ["**/*.service.ts"],
    },
  ],
};

const discoveredFiles: FileDiscoveryResult = {
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
      symbolCounts: {},
      tsFiles: 1,
    }),
  });
}

describe(CodometerService, () => {
  let service: CodometerService;
  let customStatisticsService: CustomStatisticsService;
  let fileDiscoveryService: FileDiscoveryService;
  let languagesService: LanguagesService;

  /** Builds an aggregator whose collaborators are all mocked. */
  function buildService(): CodometerService {
    return new CodometerService(
      fileDiscoveryService,
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
        {
          provide: FileDiscoveryService,
          useValue: createMock<FileDiscoveryService>(),
        },
        { provide: LanguagesService, useValue: createMock<LanguagesService>() },
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    customStatisticsService = createMock<CustomStatisticsService>();
    fileDiscoveryService = createMock<FileDiscoveryService>();
    languagesService = createMock<LanguagesService>();
    vi.mocked(fileDiscoveryService.discoverFiles).mockReturnValue(
      discoveredFiles,
    );
    vi.mocked(languagesService.analyze).mockReturnValue(buildLanguageResults());
    vi.mocked(customStatisticsService.buildSymbolCounters).mockReturnValue([]);
    vi.mocked(customStatisticsService.analyze).mockReturnValue([
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
    ]);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  it("passes the configured exclusions to discovery", () => {
    buildService().measure({ configuration, workingDirectory: "/repo" });

    expect(fileDiscoveryService.discoverFiles).toHaveBeenCalledExactlyOnceWith({
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
      symbolCounters: [],
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
      symbolCounts: {},
      trackedFiles: discoveredFiles.trackedFiles,
    });
    expect(result.custom).toStrictEqual([
      {
        color: "7c3aed",
        count: 3,
        group: "conventions",
        label: "Service Files",
      },
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
