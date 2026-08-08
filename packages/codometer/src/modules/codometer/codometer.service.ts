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
      folders: folderCount,
      javascript: {
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
      },
      json: {
        arrays: jsonStatsResult.arrays,
        booleans: jsonStatsResult.booleans,
        files: jsonStatsResult.files,
        items: jsonStatsResult.items,
        lines: jsonStatsResult.lines,
        maxDepth: jsonStatsResult.maxDepth,
        nulls: jsonStatsResult.nulls,
        numbers: jsonStatsResult.numbers,
        objects: jsonStatsResult.objects,
        properties: jsonStatsResult.properties,
        strings: jsonStatsResult.strings,
        totalNodes: jsonStatsResult.totalNodes,
      },
      linesOfCode: typescriptStats.lines + pythonStatsResult.lines,
      python: {
        classes: pythonStatsResult.classes,
        commentLines: pythonStatsResult.commentLines,
        comments: pythonStatsResult.comments,
        constants: pythonStatsResult.constants,
        decorators: pythonStatsResult.decorators,
        docstringLines: pythonStatsResult.docstringLines,
        docstrings: pythonStatsResult.docstrings,
        files: pythonStatsResult.files,
        functions: pythonStatsResult.functions,
        imports: pythonStatsResult.imports,
        lines: pythonStatsResult.lines,
        protocols: pythonStatsResult.protocols,
      },
      repoSizeMiB: (repoBytes / 1024 / 1024).toFixed(1),
      sourceFiles:
        typescriptStats.tsFiles +
        typescriptStats.jsFiles +
        pythonStatsResult.files,
      typescript: {
        decorators: typescriptStats.decorators,
        docComments: typescriptStats.docComments,
        enums: typescriptStats.enums,
        files: typescriptStats.tsFiles,
        genericDeclarations: typescriptStats.genericDeclarations,
        interfaces: typescriptStats.interfaces,
      },
    };
  }
}
