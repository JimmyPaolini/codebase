import { createMock } from "@golevelup/ts-vitest";
import { Test } from "@nestjs/testing";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CustomStatisticsService } from "../custom-statistics/custom-statistics.service";
import { FileDiscoveryService } from "../file-discovery/file-discovery.service";
import { LanguagesService } from "../languages/languages.service";
import { LimitsService } from "../limits/limits.service";
import { MetricIndexService } from "../limits/metric-index.service";
import { SizeAnalysisService } from "../size-analysis/size-analysis.service";
import { TargetsService } from "../targets/targets.service";

import { CodometerService } from "./codometer.service";

import type { FileDiscoveryResult } from "../file-discovery/file-discovery.types";
import type { LanguageResults } from "../languages/languages.types";
import type {
  ResolvedCodometerConfiguration,
  ResolvedCodometerTarget,
} from "@codometer/configuration";

const configuration: ResolvedCodometerConfiguration = {
  defaultTarget: undefined,
  exclude: ["**/node_modules/**"],
  excludeFrom: [],
  limits: [],
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
  targets: [],
};

const compiledTarget: ResolvedCodometerTarget = {
  analyses: ["size"],
  compression: "gzip",
  directory: ".",
  exclude: ["dist/**/*.map.js"],
  include: ["dist/**/*.js"],
  name: "compiled",
};

const discoveredFiles: FileDiscoveryResult = {
  cssFiles: ["src/styles.css"],
  files: ["src/app.ts", "scripts/check.py"],
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
  let limitsService: LimitsService;
  let metricIndexService: MetricIndexService;
  let sizeAnalysisService: SizeAnalysisService;
  let targetsService: TargetsService;

  /** Builds an aggregator whose collaborators are all mocked. */
  function buildService(): CodometerService {
    return new CodometerService(
      fileDiscoveryService,
      languagesService,
      customStatisticsService,
      targetsService,
      sizeAnalysisService,
      limitsService,
      metricIndexService,
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
        { provide: LimitsService, useValue: createMock<LimitsService>() },
        { provide: MetricIndexService, useValue: new MetricIndexService() },
        {
          provide: SizeAnalysisService,
          useValue: createMock<SizeAnalysisService>(),
        },
        { provide: TargetsService, useValue: createMock<TargetsService>() },
      ],
    }).compile();

    service = await module.resolve(CodometerService);
  });

  beforeEach(() => {
    customStatisticsService = createMock<CustomStatisticsService>();
    fileDiscoveryService = createMock<FileDiscoveryService>();
    languagesService = createMock<LanguagesService>();
    limitsService = createMock<LimitsService>();
    metricIndexService = new MetricIndexService();
    sizeAnalysisService = createMock<SizeAnalysisService>();
    vi.mocked(limitsService.evaluate).mockReturnValue({
      failures: [],
      limits: [],
    });
    targetsService = createMock<TargetsService>();
    vi.mocked(targetsService.matchFiles).mockReturnValue([
      "dist/index.js",
      "dist/nested/deep.js",
    ]);
    vi.mocked(sizeAnalysisService.analyze).mockReturnValue({
      bytes: 4529,
      compression: "gzip",
      files: 2,
    });
    vi.mocked(fileDiscoveryService.categorize).mockReturnValue(discoveredFiles);
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
    buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(fileDiscoveryService.discoverFiles).toHaveBeenCalledExactlyOnceWith({
      exclude: ["**/node_modules/**"],
      excludeFrom: [],
      workingDirectory: "/repo",
    });
  });

  it("hands the discovered files to every language analyzer at once", () => {
    buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

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
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(customStatisticsService.analyze).toHaveBeenCalledExactlyOnceWith({
      files: discoveredFiles.files,
      statistics: configuration.statistics,
      symbolCounts: {},
    });
    expect(result.statistics.custom).toStrictEqual([
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
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.statistics.typescript.files).toBe(1);
    expect(result.statistics.javascript.files).toBe(1);
    expect(result.statistics.javascript.classes).toBe(10);
    // The analyzer reports a set; the report carries how many are in it.
    expect(result.statistics.javascript.externalPackages).toBe(1);
  });

  it("counts notebook code toward the repository total exactly once", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    // 19 TypeScript lines, 11 Python lines, 40 lines inside notebook cells.
    expect(result.statistics.linesOfCode).toBe(70);
    expect(result.statistics.sourceFiles).toBe(3);
  });

  it("reports the codebase as a target of its own", () => {
    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.targets).toStrictEqual([
      {
        files: 2,
        language: result.statistics,
        name: "codebase",
        // Nobody asked what the codebase compresses to, so nothing answered.
        size: undefined,
      },
    ]);
  });

  it("measures the size of a declared target and leaves its language alone", () => {
    const result = buildService().measure({
      configuration: { ...configuration, targets: [compiledTarget] },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(targetsService.matchFiles).toHaveBeenCalledExactlyOnceWith({
      target: compiledTarget,
      workingDirectory: "/repo",
    });
    expect(sizeAnalysisService.analyze).toHaveBeenCalledExactlyOnceWith({
      compression: "gzip",
      files: ["dist/index.js", "dist/nested/deep.js"],
      workingDirectory: "/repo",
    });
    expect(result.targets[1]).toStrictEqual({
      files: 2,
      language: undefined,
      name: "compiled",
      size: { bytes: 4529, compression: "gzip", files: 2 },
    });
  });

  it("runs language analysis over a target that asks for it", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        targets: [{ ...compiledTarget, analyses: ["language"] }],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    // The same analyzers the codebase gets, over the files the globs claimed.
    expect(fileDiscoveryService.categorize).toHaveBeenCalledWith([
      "dist/index.js",
      "dist/nested/deep.js",
    ]);
    expect(sizeAnalysisService.analyze).not.toHaveBeenCalled();
    expect(result.targets[1]?.language?.linesOfCode).toBe(70);
  });

  // One unreadable file used to take the whole run with it, including the
  // codebase's own statistics, which the failing target had nothing to do with.
  it("steps over a target it cannot measure and keeps the rest", () => {
    vi.mocked(targetsService.matchFiles).mockImplementation(({ target }) => {
      if (target.name === "broken") {
        throw new Error("dist/ vanished mid-walk");
      }

      return ["dist/index.js", "dist/nested/deep.js"];
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        targets: [{ ...compiledTarget, name: "broken" }, compiledTarget],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures).toStrictEqual([
      {
        kind: "target",
        reason: "dist/ vanished mid-walk",
        subject: "broken",
      },
    ]);
    expect(result.statistics.linesOfCode).toBe(70);
    expect(result.targets.map((target) => target.name)).toStrictEqual([
      "codebase",
      "compiled",
    ]);
  });

  it("collects a failure from every target that could not be measured", () => {
    vi.mocked(targetsService.matchFiles).mockImplementation(({ target }) => {
      throw new Error(`${target.name} is gone`);
    });

    const result = buildService().measure({
      configuration: {
        ...configuration,
        targets: [
          { ...compiledTarget, name: "first" },
          { ...compiledTarget, name: "second" },
        ],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures.map((failure) => failure.subject)).toStrictEqual([
      "first",
      "second",
    ]);
  });

  it("reports the limits layer's failures in the report's vocabulary", () => {
    vi.mocked(limitsService.evaluate).mockReturnValue({
      failures: [{ metric: "codebase.nowhere", reason: "nothing answers" }],
      limits: [],
    });

    const result = buildService().measure({
      configuration,
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures).toStrictEqual([
      { kind: "limit", reason: "nothing answers", subject: "codebase.nowhere" },
    ]);
  });

  it("reports two targets sharing one name without dropping the run", () => {
    const result = buildService().measure({
      configuration: {
        ...configuration,
        targets: [compiledTarget, compiledTarget],
      },
      outputPaths: [],
      workingDirectory: "/repo",
    });

    expect(result.failures).toStrictEqual([
      {
        kind: "target",
        reason: expect.stringContaining(
          'Two measured targets are called "compiled"',
        ) as string,
        subject: "compiled",
      },
    ]);
    expect([...result.indexes.keys()]).toStrictEqual(["codebase", "compiled"]);
  });

  // Codometer's reports are made of what it measured, so measuring them makes
  // every report an input to the next one.
  it("never measures the files it writes itself", () => {
    vi.mocked(fileDiscoveryService.discoverFiles).mockReturnValue({
      ...discoveredFiles,
      files: ["README.md", "src/app.ts"],
    });

    buildService().measure({
      configuration,
      outputPaths: ["README.md"],
      workingDirectory: "/repo",
    });

    expect(fileDiscoveryService.categorize).toHaveBeenCalledExactlyOnceWith([
      "src/app.ts",
    ]);
  });

  it("keeps a written file out of a declared target's matches too", () => {
    vi.mocked(targetsService.matchFiles).mockReturnValue([
      "dist/index.js",
      "dist/report.json",
    ]);

    const result = buildService().measure({
      configuration: { ...configuration, targets: [compiledTarget] },
      outputPaths: ["dist/report.json"],
      workingDirectory: "/repo",
    });

    expect(sizeAnalysisService.analyze).toHaveBeenCalledExactlyOnceWith({
      compression: "gzip",
      files: ["dist/index.js"],
      workingDirectory: "/repo",
    });
    expect(result.targets[1]?.files).toBe(1);
  });
});
