import { statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { DiscoveryService } from "../discovery/discovery.service";
import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { TypescriptService } from "../typescript/typescript.service";

import type { MeasureArguments } from "./codometer.types";
import type { CodeStatisticsResult } from "@codometer/configuration";

/**
 * Aggregates discovery, TypeScript, and Python analysis results into a single report.
 */
@Injectable()
export class CodometerService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly typescriptService: TypescriptService,
    private readonly pythonService: PythonService,
    private readonly jsonService: JsonService,
    private readonly markdownService: MarkdownService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

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
      workingDirectory: directory,
    });
    const typescriptStats = this.typescriptService.analyze({
      sourceFiles: discoveredFiles.sourceFiles,
      workingDirectory: directory,
    });
    const pythonStatsResult = this.pythonService.analyze({
      command: args.configuration.python.command,
      pythonFiles: discoveredFiles.pyFiles,
      workingDirectory: directory,
    });
    const jsonStatsResult = this.jsonService.analyze({
      jsonFiles: discoveredFiles.jsonFiles,
      workingDirectory: directory,
    });
    const markdownStatsResult = this.markdownService.analyze({
      markdownFiles: discoveredFiles.markdownFiles,
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
      markdown: {
        blockQuotes: markdownStatsResult.blockQuotes,
        codeBlocks: markdownStatsResult.codeBlocks,
        files: markdownStatsResult.files,
        headingLevel1: markdownStatsResult.headingLevel1,
        headingLevel2: markdownStatsResult.headingLevel2,
        headingLevel3: markdownStatsResult.headingLevel3,
        headingLevel4: markdownStatsResult.headingLevel4,
        headingLevel5: markdownStatsResult.headingLevel5,
        headingLevel6: markdownStatsResult.headingLevel6,
        images: markdownStatsResult.images,
        inlineCode: markdownStatsResult.inlineCode,
        lines: markdownStatsResult.lines,
        links: markdownStatsResult.links,
        listItems: markdownStatsResult.listItems,
        lists: markdownStatsResult.lists,
        paragraphs: markdownStatsResult.paragraphs,
        tableRows: markdownStatsResult.tableRows,
        tables: markdownStatsResult.tables,
        taskListItems: markdownStatsResult.taskListItems,
        thematicBreaks: markdownStatsResult.thematicBreaks,
      },
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
      // Rounded to a whole MiB on purpose. At one decimal place the total sat
      // 7 KiB from a rounding boundary, so an ordinary commit flipped the badge
      // and CI disagreed with whichever machine wrote it last.
      repoSizeMiB: Math.round(repoBytes / 1024 / 1024),
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
