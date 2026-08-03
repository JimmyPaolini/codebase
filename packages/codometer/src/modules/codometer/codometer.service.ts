import { statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { DiscoverFilesService } from "../discover-files/discover-files.service";
import { MeasureJsonService } from "../measure-json/measure-json.service";
import { MeasurePythonService } from "../measure-python/measure-python.service";
import { MeasureTypescriptService } from "../measure-typescript/measure-typescript.service";

import type { CodeStatisticsResult } from "./codometer.types";

/**
 * Aggregates discovery, TypeScript, and Python analysis results into a single report.
 */
@Injectable()
export class CodometerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoverFilesService: DiscoverFilesService,
    private readonly measureTypescriptService: MeasureTypescriptService,
    private readonly measurePythonService: MeasurePythonService,
    private readonly measureJsonService: MeasureJsonService,
  ) {}

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

  /**
   * Measure aggregated repository statistics for the provided directory.
   */
  measure(directory: string): CodeStatisticsResult {
    const discoveredFiles = this.discoverFilesService.discoverFiles(directory);
    const typescriptStats = this.measureTypescriptService.analyze({
      sourceFiles: discoveredFiles.sourceFiles,
      workingDirectory: directory,
    });
    const pythonStatsResult = this.measurePythonService.analyze(directory);
    const jsonStatsResult = this.measureJsonService.analyze({
      jsonFiles: discoveredFiles.jsonFiles,
      workingDirectory: directory,
    });
    const repoBytes = this.getRepositoryBytes(
      discoveredFiles.trackedFiles,
      directory,
    );
    const folderCount = this.getFolderCount(discoveredFiles.trackedFiles);

    return {
      asyncFunctions: typescriptStats.asyncFunctions,
      classes: typescriptStats.classes + pythonStatsResult.classes,
      constants: typescriptStats.constants + pythonStatsResult.constants,
      decorators: typescriptStats.decorators + pythonStatsResult.decorators,
      enums: typescriptStats.enums,
      exported: typescriptStats.exported,
      externalPackages: typescriptStats.externalPackages.size,
      folders: folderCount,
      functions:
        typescriptStats.functions +
        typescriptStats.methods +
        pythonStatsResult.functions,
      genericDeclarations: typescriptStats.genericDeclarations,
      imports: typescriptStats.imports + pythonStatsResult.imports,
      interfaces: typescriptStats.interfaces + pythonStatsResult.protocols,
      jsFiles: typescriptStats.jsFiles,
      jsonArrays: jsonStatsResult.arrays,
      jsonBooleans: jsonStatsResult.booleans,
      jsonFiles: jsonStatsResult.files,
      jsonItems: jsonStatsResult.items,
      jsonLines: jsonStatsResult.lines,
      jsonMaxDepth: jsonStatsResult.maxDepth,
      jsonNulls: jsonStatsResult.nulls,
      jsonNumbers: jsonStatsResult.numbers,
      jsonObjects: jsonStatsResult.objects,
      jsonProperties: jsonStatsResult.properties,
      jsonStrings: jsonStatsResult.strings,
      jsonTotalNodes: jsonStatsResult.totalNodes,
      linesOfCode: typescriptStats.lines + pythonStatsResult.lines,
      methods: typescriptStats.methods,
      pythonClasses: pythonStatsResult.classes,
      pythonConstants: pythonStatsResult.constants,
      pythonDecorators: pythonStatsResult.decorators,
      pythonFiles: pythonStatsResult.files,
      pythonFunctions: pythonStatsResult.functions,
      pythonImports: pythonStatsResult.imports,
      pythonLines: pythonStatsResult.lines,
      pythonProtocols: pythonStatsResult.protocols,
      repoSizeMiB: (repoBytes / 1024 / 1024).toFixed(1),
      sourceFiles:
        typescriptStats.tsFiles +
        typescriptStats.jsFiles +
        pythonStatsResult.files,
      syncFunctions: typescriptStats.syncFunctions,
      testFiles: typescriptStats.testFiles,
      todos: typescriptStats.todos,
      tsFiles: typescriptStats.tsFiles,
    };
  }
}
