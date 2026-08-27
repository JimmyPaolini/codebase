import { DEFAULT_TARGET_NAME } from "@codometer/configuration";
import { CustomizationService } from "@codometer/customization";
import { DiscoveryService, TargetsService } from "@codometer/discovery";
import { LanguagesService } from "@codometer/languages";
import { SizeService } from "@codometer/size";
import { Injectable } from "@nestjs/common";

import { LimitsService } from "../limits/limits.service";
import { MetricIndexService } from "../limits/metric-index.service";

import type { LimitFailure } from "../limits/limits.types";
import type { ReportFailure } from "../report/report.types";
import type { DocumentationMeasurement } from "./documentation-measurement.types";
import type {
  AnalyzeLanguageArguments,
  MeasureArguments,
  MeasurementResult,
  MeasureTargetArguments,
  TargetMeasurement,
} from "./measure.types";
import type {
  CodeStatisticsResult,
  CodometerAnalysis,
  JavascriptStatistics,
  ResolvedCodometerTarget,
  TypescriptStatistics,
} from "@codometer/configuration";
import type {
  TypescriptDocumentationMeasurement,
  TypescriptResult,
} from "@codometer/languages";

/**
 * Aggregates every analyzer's report into a single set of statistics.
 */
@Injectable()
export class MeasureService {
  // 🏗 Dependency Injection

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly languagesService: LanguagesService,
    private readonly customizationService: CustomizationService,
    private readonly targetsService: TargetsService,
    private readonly sizeService: SizeService,
    private readonly limitsService: LimitsService,
    private readonly metricIndexService: MetricIndexService,
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
  private analyzeLanguage(args: AnalyzeLanguageArguments): {
    documentation: TypescriptDocumentationMeasurement[];
    statistics: CodeStatisticsResult;
  } {
    const directory = args.workingDirectory;
    const { discoveredFiles } = args;
    const languages = this.languagesService.analyze({
      configuration: args.configuration,
      discoveredFiles,
      symbolCounters: this.customizationService.buildSymbolCounters(
        args.configuration.statistics,
      ),
      workingDirectory: directory,
    });
    // `none` compression is size analysis's own way of saying "uncompressed",
    // which is what a headline byte total is: the reader is not asking what
    // this target compresses to, only how large it is.
    const size = this.sizeService.analyze({
      compression: "none",
      files: discoveredFiles.files,
      workingDirectory: directory,
    });

    return {
      documentation: languages.typescript.documentation,
      statistics: {
        css: { ...languages.css },
        custom: this.customizationService.analyze({
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
        // Notebook code is source too: its lines are counted once here, and
        // the cells they came from are never handed to the standalone
        // analyzers.
        linesOfCode:
          languages.typescript.lines +
          languages.python.lines +
          languages.jupyter.codeLines,
        markdown: { ...languages.markdown },
        python: { ...languages.python },
        repositoryBytes: size.bytes,
        shell: { ...languages.shell },
        sourceFiles:
          languages.typescript.tsFiles +
          languages.typescript.jsFiles +
          languages.python.files,
        sql: { ...languages.sql },
        toml: { ...languages.toml },
        typescript: this.buildTypescriptStatistics(languages.typescript),
        yaml: { ...languages.yaml },
      },
    };
  }

  /** Stamps every documentation measurement with the target it was found in. */
  private attachTargetName(
    documentation: readonly TypescriptDocumentationMeasurement[],
    targetName: string,
  ): DocumentationMeasurement[] {
    return documentation.map((measurement) => ({
      ...measurement,
      target: targetName,
    }));
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

  /** Reads whatever a target's measurement threw as a printable sentence. */
  private describeFailure(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Discovers the codebase's files, minus the ones codometer writes itself.
   *
   * The exclusion is applied here rather than handed to discovery as a glob,
   * so a destination is removed by being that exact file and not by matching
   * a pattern that might claim another.
   */
  private discoverCodebase(args: MeasureArguments): string[] {
    const discovered = this.discoveryService.discoverFiles({
      exclude: args.configuration.exclude,
      excludeFrom: args.configuration.excludeFrom,
      workingDirectory: args.workingDirectory,
    });

    return this.excludeOutputPaths(discovered.files, args.outputPaths);
  }

  /**
   * Drops the files codometer writes from a list of measured ones.
   *
   * Codometer's reports are made of what it measured, so measuring them makes
   * every report an input to the next one: a badge block changes the markdown
   * counters, which changes the badges. Removing them is what makes a second
   * run over an untouched tree produce the same bytes as the first.
   */
  private excludeOutputPaths(
    files: string[],
    outputPaths: readonly string[],
  ): string[] {
    if (outputPaths.length === 0) {
      return files;
    }

    const excluded = new Set(outputPaths);

    return files.filter((filePath) => !excluded.has(filePath));
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
   * Measure every declared target, keeping whatever the failures leave.
   *
   * A target that cannot be measured — a glob pointing at a directory that
   * vanished, a file that will not open — is recorded and stepped over. One
   * unreadable file used to take the whole run with it, including the
   * codebase's own statistics, which no target had anything to do with.
   */
  private measureDeclaredTargets(args: MeasureArguments): {
    failures: ReportFailure[];
    targets: TargetMeasurement[];
  } {
    const failures: ReportFailure[] = [];
    const targets: TargetMeasurement[] = [];

    for (const target of args.configuration.targets) {
      try {
        targets.push(
          this.measureTarget({
            configuration: args.configuration,
            outputPaths: args.outputPaths,
            target,
            workingDirectory: args.workingDirectory,
          }),
        );
      } catch (error: unknown) {
        failures.push({
          kind: "target",
          reason: this.describeFailure(error),
          subject: target.name,
        });
      }
    }

    return { failures, targets };
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
    const files = this.excludeOutputPaths(
      this.targetsService.matchFiles({
        target,
        workingDirectory: args.workingDirectory,
      }),
      args.outputPaths,
    );
    const language = this.runsAnalysis(target, "language")
      ? this.analyzeLanguage({
          configuration: args.configuration,
          discoveredFiles: this.discoveryService.categorize(files),
          workingDirectory: args.workingDirectory,
        })
      : undefined;

    return {
      documentation:
        language === undefined
          ? []
          : this.attachTargetName(language.documentation, target.name),
      files: files.length,
      language: language?.statistics,
      name: target.name,
      size: this.runsAnalysis(target, "size")
        ? this.sizeService.analyze({
            compression: target.compression,
            files,
            workingDirectory: args.workingDirectory,
          })
        : undefined,
    };
  }

  /** Restates the limits layer's failures in the report's own vocabulary. */
  private readLimitFailures(
    failures: readonly LimitFailure[],
  ): ReportFailure[] {
    return failures.map((failure) => ({
      kind: "limit",
      reason: failure.reason,
      subject: failure.metric,
    }));
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
   * can name, being whatever the repository's ignore files leave behind. It is
   * also the one target measured without a net — if the directory it was
   * pointed at cannot be read there is no report to salvage, whereas a
   * declared target that fails leaves everything else worth reporting.
   */
  measure(args: MeasureArguments): MeasurementResult {
    const files = this.discoverCodebase(args);
    const codebase = this.analyzeLanguage({
      configuration: args.configuration,
      discoveredFiles: this.discoveryService.categorize(files),
      workingDirectory: args.workingDirectory,
    });
    const declared = this.measureDeclaredTargets(args);
    const targets: TargetMeasurement[] = [
      {
        documentation: this.attachTargetName(
          codebase.documentation,
          DEFAULT_TARGET_NAME,
        ),
        files: files.length,
        language: codebase.statistics,
        name: DEFAULT_TARGET_NAME,
        size: undefined,
      },
      ...declared.targets,
    ];
    const { duplicates, indexes } = this.metricIndexService.index(targets);
    // Evaluated here rather than by whoever renders the report, so that a
    // limit addressing a metric nothing measured is a failure of the
    // measurement rather than of one output format.
    const evaluation = this.limitsService.evaluate({
      configuration: args.configuration,
      indexes,
    });

    return {
      documentation: targets.flatMap((target) => target.documentation),
      failures: [
        ...declared.failures,
        ...duplicates.map((duplicate) => ({
          kind: "target" as const,
          reason: duplicate.reason,
          subject: duplicate.target,
        })),
        ...this.readLimitFailures(evaluation.failures),
      ],
      indexes,
      limits: evaluation.limits,
      statistics: codebase.statistics,
      targets,
    };
  }
}
