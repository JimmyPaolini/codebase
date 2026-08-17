import { statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { CustomStatisticsService } from "../custom-statistics/custom-statistics.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { LanguagesService } from "../languages/languages.service";

import type { TypescriptResult } from "../typescript/typescript.types";
import type { MeasureArguments } from "./codometer.types";
import type {
  CodeStatisticsResult,
  JavascriptStatistics,
  TypescriptStatistics,
} from "@codometer/configuration";

/**
 * Aggregates every analyzer's report into a single set of statistics.
 */
@Injectable()
export class CodometerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly languagesService: LanguagesService,
    private readonly customStatisticsService: CustomStatisticsService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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
   * Count the unique folders represented by the tracked files.
   */
  private getFolderCount(trackedFiles: string[]): number {
    const trackedFolders = new Set<string>();

    for (const filePath of trackedFiles) {
      const parts = filePath.split("/");

      for (let index = 1; index < parts.length; index++) {
        trackedFolders.add(parts.slice(0, index).join("/"));
      }
    }

    return trackedFolders.size;
  }

  /**
   * Sum the file sizes for the tracked files.
   */
  private getRepositoryBytes(
    trackedFiles: string[],
    directory: string,
  ): number {
    let repositoryBytes = 0;

    for (const filePath of trackedFiles) {
      try {
        repositoryBytes += statSync(path.resolve(directory, filePath)).size;
      } catch {
        continue;
      }
    }

    return repositoryBytes;
  }

  // 🌎 Public Methods

  /**
   * Measure aggregated repository statistics for the provided directory.
   */
  measure(args: MeasureArguments): CodeStatisticsResult {
    const directory = args.workingDirectory;
    const discoveredFiles = this.discoveryService.discoverFiles({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workingDirectory: directory,
    });
    const languages = this.languagesService.analyze({
      configuration: args.configuration,
      discoveredFiles,
      symbolCounters: this.customStatisticsService.buildSymbolCounters(
        args.configuration.statistics,
      ),
      workingDirectory: directory,
    });
    const repoBytes = this.getRepositoryBytes(
      discoveredFiles.trackedFiles,
      directory,
    );

    return {
      css: { ...languages.css },
      custom: this.customStatisticsService.analyze({
        statistics: args.configuration.statistics,
        symbolCounts: languages.typescript.symbolCounts,
        trackedFiles: discoveredFiles.trackedFiles,
      }),
      folders: this.getFolderCount(discoveredFiles.trackedFiles),
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
}
