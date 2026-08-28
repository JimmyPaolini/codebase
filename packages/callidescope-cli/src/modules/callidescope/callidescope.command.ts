import path from "node:path";

import {
  DEFAULT_JSON_INDENTATION,
  DEFAULT_PREVIEW_COUNT,
  InputError,
  InputService,
} from "@callidescope/configuration";
import {
  MarkdownReportService,
  OutputJsonService,
  OutputMarkdownService,
} from "@callidescope/output";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { CHECK_NAMES } from "../run-plan/run-plan.constants";
import { RunPlanService } from "../run-plan/run-plan.service";

import { PROJECT_README_NAME } from "./callidescope.constants";
import { CallidescopeService } from "./callidescope.service";

import type { ReportFindingsArguments } from "../run-plan/run-plan.types";
import type {
  CallidescopeCommandOptions,
  SyncDestinationsArguments,
} from "./callidescope.types";
import type {
  CallGraphResult,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
} from "@callidescope/configuration";
import type { ProjectSection } from "@callidescope/output";

/**
 * CLI entry point for the call-stack tracing workflow.
 */
@Command({
  description: "Run the callidescope command",
  name: "callidescope",
})
@Injectable()
export class CallidescopeCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly callidescopeService: CallidescopeService,
    private readonly inputService: InputService,
    private readonly outputJsonService: OutputJsonService,
    private readonly outputMarkdownService: OutputMarkdownService,
    private readonly markdownReportService: MarkdownReportService,
    private readonly runPlanService: RunPlanService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CallidescopeCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Builds one section per project, addressed to that project's README. */
  private buildProjectSections(args: {
    destination: ResolvedCallidescopeProjectReadmeConfiguration;
    projectRoots: ReadonlyMap<string, string>;
    result: CallGraphResult;
  }): ProjectSection[] {
    // A project whose root is unknown is dropped rather than defaulted: the
    // fallback for a missing root is a path, and the wrong path is a README
    // rewritten somewhere nobody asked for.
    return args.result.projects.flatMap((report) => {
      const root = args.projectRoots.get(report.projectName);

      return root === undefined
        ? []
        : [
            {
              content: this.markdownReportService.renderProjectSection({
                heading: args.destination.heading,
                previewCount: args.destination.previewCount,
                rendering: "tree",
                report,
              }),
              path: path.join(root, PROJECT_README_NAME),
            },
          ];
    });
  }

  /** How many stacks a section shows before the rest are folded away. */
  private readPreviewCount(
    configuration: ResolvedCallidescopeConfiguration,
  ): number {
    return (
      configuration.output.projectReadmes?.previewCount ?? DEFAULT_PREVIEW_COUNT
    );
  }

  /** Logs a command line the input service refused, and fails the run. */
  private rejectCommandLine(error: InputError): void {
    this.logger.error("🔭 Rejected the command line", undefined, {
      reason: error.message,
    });
    process.exitCode = 1;
  }

  /**
   * Prints the run in the requested format.
   *
   * Markdown unless asked otherwise: it is the one rendering that reads well
   * in a terminal, pastes into an issue, and is already what the file
   * destinations write, so there is no second format to keep in step. A
   * diagram printed to a terminal is mermaid source, which is what someone
   * asking for one at a prompt wants to paste somewhere that renders it.
   */
  private report(args: {
    configuration: ResolvedCallidescopeConfiguration;
    result: CallGraphResult;
  }): void {
    const { format, json } = args.configuration.output;

    if (format === "json") {
      process.stdout.write(
        this.outputJsonService.buildReport({
          destination: json ?? {
            indentation: DEFAULT_JSON_INDENTATION,
            path: "",
          },
          result: args.result,
        }),
      );

      return;
    }

    process.stdout.write(
      this.markdownReportService.renderRun({
        previewCount: this.readPreviewCount(args.configuration),
        rendering: format === "mermaid" ? "diagram" : "tree",
        result: args.result,
      }),
    );
  }

  /**
   * Names the stacks that ran deeper than callidescope allows.
   *
   * Reported whether or not the run gates on them — a stack this long is worth
   * saying out loud even in a run that only wrote a report — but only a run
   * asked to fail on depth fails on it.
   */
  private reportDeepStacks(args: ReportFindingsArguments): boolean {
    const { deepStacks } = args.result;

    if (deepStacks.length === 0) {
      return false;
    }

    this.logger.error(`🔭 Found call stacks too deep`, undefined, {
      count: deepStacks.length,
      deepest: Math.max(...deepStacks.map((stack) => stack.depth)),
      entryPoints: deepStacks.map((stack) => stack.frames[0]?.displayName),
    });

    return args.mode.checksDepth;
  }

  /**
   * Weighs every finding a run can produce, and fails on any of them.
   *
   * They are weighed separately and announced separately. A stack that is too
   * deep is something the code does; a callable calling too many things is
   * something else the code does; a stale report is something the checkout
   * has not caught up with. Reading one as another sends the author to fix
   * the wrong thing.
   */
  private reportFindings(args: ReportFindingsArguments): void {
    const stale = this.reportStaleness(args);
    const deep = this.reportDeepStacks(args);
    const wide = this.reportWideCallables(args);

    if (deep || wide || stale) {
      process.exitCode = 1;
    }
  }

  /** Names the destinations that no longer hold what a fresh run would write. */
  private reportStaleness(args: ReportFindingsArguments): boolean {
    if (args.stalePaths.length === 0) {
      return false;
    }

    this.logger.error(`🔭 Found stale reports`, undefined, {
      paths: args.stalePaths,
    });

    return true;
  }

  /**
   * Names the callables that called more things directly than callidescope
   * allows.
   *
   * Reported whether or not the run gates on them, mirroring
   * `reportDeepStacks` — but only a run asked to fail on breadth fails on it.
   */
  private reportWideCallables(args: ReportFindingsArguments): boolean {
    const { wideCallables } = args.result;

    if (wideCallables.length === 0) {
      return false;
    }

    this.logger.error(
      `🔭 Found callables calling too much directly`,
      undefined,
      {
        callables: wideCallables.map((finding) => finding.displayName),
        count: wideCallables.length,
        widest: Math.max(...wideCallables.map((finding) => finding.breadth)),
      },
    );

    return args.mode.checksBreadth;
  }

  /** Writes every configured destination, returning the stale ones. */
  private syncDestinations(args: SyncDestinationsArguments): string[] {
    const stale: string[] = [];
    const { json, markdown, mermaid } = args.configuration.output;

    if (
      json !== undefined &&
      !this.outputJsonService.sync({
        check: args.check,
        destination: json,
        result: args.result,
      })
    ) {
      stale.push(json.path);
    }

    // Both anchored destinations write the same report; they differ only in
    // whether its stacks are printed or drawn.
    for (const [destination, rendering] of [
      [markdown, "tree"],
      [mermaid, "diagram"],
    ] as const) {
      if (
        destination !== undefined &&
        !this.outputMarkdownService.sync({
          check: args.check,
          content: this.markdownReportService.renderRun({
            previewCount: this.readPreviewCount(args.configuration),
            rendering,
            result: args.result,
          }),
          destination,
          result: args.result,
        })
      ) {
        stale.push(destination.path);
      }
    }

    const { projectReadmes } = args.configuration.output;

    if (projectReadmes !== undefined) {
      stale.push(
        ...this.outputMarkdownService.syncProjectReadmes({
          check: args.check,
          destination: projectReadmes,
          sections: this.buildProjectSections({
            destination: projectReadmes,
            projectRoots: args.projectRoots,
            result: args.result,
          }),
        }),
      );
    }

    return stale;
  }

  /** Traces the workspace, reports, and sets the exit code. */
  private async traceWorkspace(
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    const resolvedOptions =
      await this.inputService.resolveFormatOption(options);
    const prepared = await this.runPlanService.prepareRun(resolvedOptions);

    if (prepared === undefined) {
      return;
    }

    const { configuration, mode, workspaceRoot } = prepared;

    const outcome = this.callidescopeService.trace({
      configuration,
      directories: resolvedOptions.directories ?? configuration.directories,
      workspaceRoot,
    });

    this.report({ configuration, result: outcome.result });

    // Reports are produced before either finding is weighed, so a run that
    // writes and gates leaves its reports behind even when the gate trips.
    const stalePaths = this.runPlanService.touchesFiles(mode)
      ? this.syncDestinations({
          check: mode.checksReports,
          configuration,
          projectRoots: outcome.projectRoots,
          result: outcome.result,
        })
      : [];

    this.logger.info("🔭 Finished a call-stack trace", undefined, {
      deepStackCount: outcome.result.deepStacks.length,
      staleReportCount: stalePaths.length,
      wideCallableCount: outcome.result.wideCallables.length,
    });

    this.reportFindings({ mode, result: outcome.result, stalePaths });
  }

  // 🌎 Public Methods

  /**
   * Parses the set of things the run fails on.
   *
   * The parser runs only when `--check` carries a value, so anything reaching
   * it is a written set. A `--check` with no value never arrives here and is
   * refused later: a set with nothing in it is indistinguishable from the flag
   * having been left off, which is how one flag came to gate two findings.
   */
  @Option({
    description: `Fail on a comma-separated set drawn from ${CHECK_NAMES.map((name) => `"${name}"`).join(" and ")}`,
    flags: "--check [check]",
  })
  public parseCheck(value: string): string {
    return value;
  }

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses `--directories`, a comma-separated list of project directories. */
  @Option({
    description: "Comma-separated project directories to trace",
    flags: "-d, --directories [directories]",
  })
  public parseDirectories(value: string | undefined): string[] {
    return this.inputService.parseCommaDelimitedOption(value);
  }

  /** Parses `--format`, which decides what the run prints. */
  @Option({
    description: "What to print: markdown, mermaid, or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    return this.inputService.parseFormat(value);
  }

  /** Parses `--json`. */
  @Option({
    description: "Path to write the JSON report to",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /** Parses `--markdown`. */
  @Option({
    description: "Path to splice the markdown block into",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return this.inputService.parseOptionalOption(value);
  }

  /**
   * Parses `--write`, which asks for every configured destination to be
   * rewritten.
   *
   * A boolean flag reaches the parser as `undefined` when it carries no value,
   * and the parser runs only when the flag is present, so presence is the whole
   * signal.
   */
  @Option({
    description: "Write every configured destination",
    flags: "--write",
  })
  public parseWrite(value: boolean | undefined): boolean {
    return value ?? true;
  }

  /**
   * Traces the workspace, reports, and sets the exit code.
   *
   * The flags are independent: `--write` writes, `--check reports` fails on a
   * stale report, `--check depth` fails on a stack that ran too deep, and none
   * of them turns another on. A run given neither `--write` nor
   * `--check reports` leaves every file alone.
   */
  public async run(
    _passedParameters: string[],
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    try {
      await this.traceWorkspace(options);
    } catch (error) {
      if (!(error instanceof InputError)) {
        throw error;
      }

      this.rejectCommandLine(error);
    }
  }
}
