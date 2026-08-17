import path from "node:path";

import { ConfigurationService } from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";
import { ReportService } from "../report/report.service";

import { CallidescopeService } from "./callidescope.service";

import type {
  CallidescopeCommandOptions,
  SyncDestinationsArguments,
} from "./callidescope.types";
import type {
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeMarkdownOutputConfiguration,
} from "@callidescope/configuration";

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
    private readonly configurationService: ConfigurationService,
    private readonly callidescopeService: CallidescopeService,
    private readonly outputJsonService: OutputJsonService,
    private readonly outputMarkdownService: OutputMarkdownService,
    private readonly reportService: ReportService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(CallidescopeCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Prints the whole console report. */
  private report(args: {
    limit: number;
    outcome: ReturnType<CallidescopeService["trace"]>;
  }): void {
    const { result } = args.outcome;

    process.stdout.write(
      this.reportService.renderHeader({
        limit: args.limit,
        projectNames: args.outcome.projectNames,
      }),
    );
    process.stdout.write(this.reportService.renderStacks(result));
    process.stdout.write(this.reportService.renderCohesion(result));
    process.stdout.write(this.reportService.renderSummary(result));
  }

  /** Merges the markdown destination a flag named over the configured one. */
  private resolveMarkdownDestination(args: {
    configuration: ResolvedCallidescopeConfiguration;
    markdown: string | undefined;
  }): ResolvedCallidescopeMarkdownOutputConfiguration | undefined {
    const configured = args.configuration.output.markdown;

    if (args.markdown === undefined) {
      return configured;
    }

    return this.configurationService.resolveConfiguration({
      output: { markdown: { path: args.markdown } },
    }).output.markdown;
  }

  /** Writes every configured destination, returning the stale ones. */
  private syncDestinations(args: SyncDestinationsArguments): string[] {
    const stale: string[] = [];
    const { json, markdown } = args.configuration.output;

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

    if (
      markdown !== undefined &&
      !this.outputMarkdownService.sync({
        check: args.check,
        destination: markdown,
        result: args.result,
      })
    ) {
      stale.push(markdown.path);
    }

    return stale;
  }

  // 🌎 Public Methods

  /**
   * Parses `--check`.
   *
   * A valueless flag arrives as `undefined`, so presence is what the flag
   * means. Note that `run` reads the raw option rather than calling this again:
   * doing so would turn every run into a check.
   */
  @Option({
    description: "Fail instead of writing, when a destination is stale",
    flags: "--check",
  })
  public parseCheck(value: string | undefined): boolean {
    return value === undefined ? true : value !== "false";
  }

  /** Parses `--config`. */
  @Option({
    description: "Path to a callidescope configuration file",
    flags: "--config [config]",
  })
  public parseConfig(value: string | undefined): string | undefined {
    return value;
  }

  /** Parses `--directory`. */
  @Option({
    description: "Workspace root to trace",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    // Resolved rather than kept as written. Everything downstream compares
    // absolute paths against this prefix to decide whether a file is part of
    // the traced code, and a relative root makes every one of those comparisons
    // fail — which reads as a workspace containing nothing at all.
    return path.resolve(value ?? process.cwd());
  }

  /** Parses `--json`. */
  @Option({
    description: "Path to write the JSON report to",
    flags: "--json [json]",
  })
  public parseJson(value: string | undefined): string | undefined {
    return value;
  }

  /** Parses `--markdown`. */
  @Option({
    description: "Path to splice the markdown block into",
    flags: "-m, --markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return value;
  }

  /** Parses `--projects`, a comma-separated list of Nx project names. */
  @Option({
    description: "Comma-separated Nx project names to trace",
    flags: "-p, --projects [projects]",
  })
  public parseProjects(value: string | undefined): string[] {
    return value === undefined
      ? []
      : value
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);
  }

  /** Traces the workspace, reports, and sets the exit code. */
  public async run(
    _passedParameters: string[],
    options: CallidescopeCommandOptions,
  ): Promise<void> {
    // Resolved again rather than trusting the parser: the flag may be absent,
    // in which case no parser ran at all.
    const workspaceRoot = path.resolve(options.directory ?? process.cwd());
    const loaded = await this.configurationService.loadConfiguration({
      configurationPath: options.config,
      searchDirectory: workspaceRoot,
    });
    const configuration: ResolvedCallidescopeConfiguration = {
      ...loaded,
      output: {
        json:
          options.json === undefined
            ? loaded.output.json
            : { indentation: 2, path: options.json },
        markdown: this.resolveMarkdownDestination({
          configuration: loaded,
          markdown: options.markdown,
        }),
      },
    };

    const outcome = this.callidescopeService.trace({
      configuration,
      projectNames: options.projects ?? configuration.projects,
      workspaceRoot,
    });

    this.report({ limit: configuration.limits.maximumDepth, outcome });

    const stale = this.syncDestinations({
      check: options.check ?? false,
      configuration,
      result: outcome.result,
    });

    if (stale.length > 0) {
      this.logger.error("🔭 Found stale reports", undefined, { paths: stale });
      process.exitCode = 1;
    }

    if (outcome.result.deepStacks.length > 0) {
      process.exitCode = 1;
    }
  }
}
