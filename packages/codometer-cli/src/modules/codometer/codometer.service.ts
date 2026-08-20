import { statSync } from "node:fs";
import path from "node:path";

import { DEFAULT_TARGET_NAME } from "@codometer/configuration";
import { Injectable } from "@nestjs/common";

import { CustomStatisticsService } from "../custom-statistics/custom-statistics.service";
import { FileDiscoveryService } from "../file-discovery/file-discovery.service";
import { LanguagesService } from "../languages/languages.service";
import { SizeAnalysisService } from "../size-analysis/size-analysis.service";
import { TargetsService } from "../targets/targets.service";

import type { TypescriptResult } from "../typescript/typescript.types";
import type {
  AnalyzeLanguageArguments,
  MeasureArguments,
  MeasurementResult,
  MeasureTargetArguments,
  TargetMeasurement,
} from "./codometer.types";
import type {
  CodeStatisticsResult,
  CodometerAnalysis,
  JavascriptStatistics,
  ResolvedCodometerTarget,
  TypescriptStatistics,
} from "@codometer/configuration";

/**
 * Aggregates every analyzer's report into a single set of statistics.
 */
@Injectable()
export class CodometerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly fileDiscoveryService: FileDiscoveryService,
    private readonly languagesService: LanguagesService,
    private readonly customStatisticsService: CustomStatisticsService,
    private readonly targetsService: TargetsService,
    private readonly sizeAnalysisService: SizeAnalysisService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Run every language analyzer over one target's files.
   *
   * Takes the files it is given rather than finding them, so the codebase and
   * a target naming compiled output are counted by exactly the same analyzers.
   */
  private analyzeLanguage(
    args: AnalyzeLanguageArguments,
  ): CodeStatisticsResult {
    const directory = args.workingDirectory;
    const { discoveredFiles } = args;
    const languages = this.languagesService.analyze({
      configuration: args.configuration,
      discoveredFiles,
      symbolCounters: this.customStatisticsService.buildSymbolCounters(
        args.configuration.statistics,
      ),
      workingDirectory: directory,
    });
    const repoBytes = this.getRepositoryBytes(discoveredFiles.files, directory);

    return {
      css: { ...languages.css },
      custom: this.customStatisticsService.analyze({
        files: discoveredFiles.files,
        statistics: args.configuration.statistics,
        symbolCounts: languages.typescript.symbolCounts,
      }),
      folders: this.getFolderCount(discoveredFiles.files),
      hcl: { ...languages.hcl },
      javascript: this.buildJavascriptStatistics(languages.typescript),
      // The JSON, Jupyter, markdown, and Python analyzers already report
      // exactly the shape their group declares, so nothing is projected.
      json: { ...languages.json },
      jupyter: { ...languages.jupyter },
      // Notebook code is source too: its lines are counted once here, and the
      // cells they came from are never handed to the standalone analyzers.
      linesOfCode:
        languages.typescript.lines +
        languages.python.lines +
        languages.jupyter.codeLines,
      markdown: { ...languages.markdown },
      python: { ...languages.python },
      // Rounded to a whole MiB on purpose. At one decimal place the total sat
      // 7 KiB from a rounding boundary, so an ordinary commit flipped the badge
      // and CI disagreed with whichever machine wrote it last.
      repoSizeMiB: Math.round(repoBytes / 1024 / 1024),
      shell: { ...languages.shell },
      sourceFiles:
        languages.typescript.tsFiles +
        languages.typescript.jsFiles +
        languages.python.files,
      sql: { ...languages.sql },
      toml: { ...languages.toml },
      typescript: this.buildTypescriptStatistics(languages.typescript),
      yaml: { ...languages.yaml },
    };
  }

  /** Project the TypeScript analyzer's counters onto the JavaScript group. */
  private buildJavascriptStatistics(
    typescriptStats: TypescriptResult,
  ): JavascriptStatistics {
    return {
      asyncFunctions: typescriptStats.asyncFunctions,
      classes: typescriptStats.classes,
      commentLines: typescriptStats.commentLines,
      comments: typescriptStats.comments,
      constants: typescriptStats.constants,
      exported: typescriptStats.exported,
      externalPackages: typescriptStats.externalPackages.size,
      files: typescriptStats.jsFiles,
      functions: typescriptStats.functions,
      imports: typescriptStats.imports,
      methods: typescriptStats.methods,
      syncFunctions: typescriptStats.syncFunctions,
      testFiles: typescriptStats.testFiles,
      todos: typescriptStats.todos,
    };
  }

  /** Project the TypeScript analyzer's counters onto the TypeScript group. */
  private buildTypescriptStatistics(
    typescriptStats: TypescriptResult,
  ): TypescriptStatistics {
    return {
      decorators: typescriptStats.decorators,
      docComments: typescriptStats.docComments,
      enums: typescriptStats.enums,
      files: typescriptStats.tsFiles,
      genericDeclarations: typescriptStats.genericDeclarations,
      interfaces: typescriptStats.interfaces,
    };
  }

  /**
   * Count the unique folders the target's files sit in.
   */
  private getFolderCount(files: string[]): number {
    const folders = new Set<string>();

    for (const filePath of files) {
      const parts = filePath.split("/");

      for (let index = 1; index < parts.length; index++) {
        folders.add(parts.slice(0, index).join("/"));
      }
    }

    return folders.size;
  }

  /**
   * Sum the on-disk sizes of the target's files.
   */
  private getRepositoryBytes(files: string[], directory: string): number {
    let repositoryBytes = 0;

    for (const filePath of files) {
      try {
        repositoryBytes += statSync(path.resolve(directory, filePath)).size;
      } catch {
        continue;
      }
    }

    return repositoryBytes;
  }

  /**
   * Measure one declared target with whichever analyses it asked for.
   *
   * An analysis nobody asked for is not run at all. Compressing a source tree
   * to answer a question nobody put costs more than every other analysis put
   * together.
   */
  private measureTarget(args: MeasureTargetArguments): TargetMeasurement {
    const { target } = args;
    const files = this.targetsService.matchFiles({
      target,
      workingDirectory: args.workingDirectory,
    });

    return {
      files: files.length,
      language: this.runsAnalysis(target, "language")
        ? this.analyzeLanguage({
            configuration: args.configuration,
            discoveredFiles: this.fileDiscoveryService.categorize(files),
            workingDirectory: args.workingDirectory,
          })
        : undefined,
      name: target.name,
      size: this.runsAnalysis(target, "size")
        ? this.sizeAnalysisService.analyze({
            compression: target.compression,
            files,
            workingDirectory: args.workingDirectory,
          })
        : undefined,
    };
  }

  /** Whether a target asked for one of the analyses. */
  private runsAnalysis(
    target: ResolvedCodometerTarget,
    analysis: CodometerAnalysis,
  ): boolean {
    return target.analyses.includes(analysis);
  }

  // 🌎 Public Methods

  /**
   * Measure the codebase and every target declared alongside it.
   *
   * The codebase is measured first and always: it is the one target no glob
   * can name, being whatever the repository's ignore files leave behind.
   */
  measure(args: MeasureArguments): MeasurementResult {
    const discoveredFiles = this.fileDiscoveryService.discoverFiles({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workingDirectory: args.workingDirectory,
    });
    const statistics = this.analyzeLanguage({
      configuration: args.configuration,
      discoveredFiles,
      workingDirectory: args.workingDirectory,
    });

    return {
      statistics,
      targets: [
        {
          files: discoveredFiles.files.length,
          language: statistics,
          name: DEFAULT_TARGET_NAME,
          size: undefined,
        },
        ...args.configuration.targets.map((target) =>
          this.measureTarget({
            configuration: args.configuration,
            target,
            workingDirectory: args.workingDirectory,
          }),
        ),
      ],
    };
  }
}
