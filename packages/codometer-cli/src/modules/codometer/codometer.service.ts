import { statSync } from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";

import { CssService } from "../css/css.service";
import { DiscoveryService } from "../discovery/discovery.service";
import { HclService } from "../hcl/hcl.service";
import { JsonService } from "../json/json.service";
import { JupyterService } from "../jupyter/jupyter.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { ShellService } from "../shell/shell.service";
import { SqlService } from "../sql/sql.service";
import { TomlService } from "../toml/toml.service";
import { TypescriptService } from "../typescript/typescript.service";
import { YamlService } from "../yaml/yaml.service";

import type { DiscoveryResult } from "../discovery/discovery.types";
import type { TypescriptResult } from "../typescript/typescript.types";
import type {
  ConfigurationLanguageResults,
  MeasureArguments,
} from "./codometer.types";
import type {
  CodeStatisticsResult,
  JavascriptStatistics,
  TypescriptStatistics,
} from "@codometer/configuration";

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
    private readonly jupyterService: JupyterService,
    private readonly yamlService: YamlService,
    private readonly cssService: CssService,
    private readonly hclService: HclService,
    private readonly shellService: ShellService,
    private readonly sqlService: SqlService,
    private readonly tomlService: TomlService,
  ) {}

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Run the analyzers that need nothing but their own files.
   *
   * Grouped into one step because each is independent of the others and of
   * everything measured so far: keeping them out of `measure` is what keeps
   * the pipeline readable as it grows a language at a time.
   */
  private analyzeConfigurationLanguages(
    args: MeasureArguments,
    discoveredFiles: DiscoveryResult,
  ): ConfigurationLanguageResults {
    const workingDirectory = args.workingDirectory;

    return {
      css: this.cssService.analyze({
        cssFiles: discoveredFiles.cssFiles,
        workingDirectory,
      }),
      hcl: this.hclService.analyze({
        hclFiles: discoveredFiles.hclFiles,
        workingDirectory,
      }),
      shell: this.shellService.analyze({
        shellFiles: discoveredFiles.shellFiles,
        workingDirectory,
      }),
      sql: this.sqlService.analyze({
        sqlFiles: discoveredFiles.sqlFiles,
        workingDirectory,
      }),
      toml: this.tomlService.analyze({
        tomlFiles: discoveredFiles.tomlFiles,
        workingDirectory,
      }),
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
    const yamlStatsResult = this.yamlService.analyze({
      workingDirectory: directory,
      yamlFiles: discoveredFiles.yamlFiles,
    });
    const jupyterStatsResult = this.jupyterService.analyze({
      notebookFiles: discoveredFiles.notebookFiles,
      pythonCommand: args.configuration.python.command,
      workingDirectory: directory,
    });
    const repoBytes = this.getRepositoryBytes(
      discoveredFiles.trackedFiles,
      directory,
    );
    const folderCount = this.getFolderCount(discoveredFiles.trackedFiles);
    const configuration = this.analyzeConfigurationLanguages(
      args,
      discoveredFiles,
    );

    return {
      css: { ...configuration.css },
      folders: folderCount,
      hcl: { ...configuration.hcl },
      javascript: this.buildJavascriptStatistics(typescriptStats),
      // The JSON, Jupyter, markdown, and Python analyzers already report
      // exactly the shape their group declares, so nothing is projected.
      json: { ...jsonStatsResult },
      jupyter: { ...jupyterStatsResult },
      // Notebook code is source too: its lines are counted once here, and the
      // cells they came from are never handed to the standalone analyzers.
      linesOfCode:
        typescriptStats.lines +
        pythonStatsResult.lines +
        jupyterStatsResult.codeLines,
      markdown: { ...markdownStatsResult },
      python: { ...pythonStatsResult },
      // Rounded to a whole MiB on purpose. At one decimal place the total sat
      // 7 KiB from a rounding boundary, so an ordinary commit flipped the badge
      // and CI disagreed with whichever machine wrote it last.
      repoSizeMiB: Math.round(repoBytes / 1024 / 1024),
      shell: { ...configuration.shell },
      sourceFiles:
        typescriptStats.tsFiles +
        typescriptStats.jsFiles +
        pythonStatsResult.files,
      sql: { ...configuration.sql },
      toml: { ...configuration.toml },
      typescript: this.buildTypescriptStatistics(typescriptStats),
      yaml: { ...yamlStatsResult },
    };
  }
}
