import path from "node:path";

import {
  ConfigurationService,
  DEFAULT_JSON_INDENTATION,
  DEFAULT_PREVIEW_COUNT,
} from "@callidescope/configuration";
import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { OutputJsonService } from "../output-json/output-json.service";
import { OutputMarkdownService } from "../output-markdown/output-markdown.service";
import { MarkdownReportService } from "../report/markdown-report.service";

import { PROJECT_README_NAME } from "./callidescope.constants";
import { CallidescopeService } from "./callidescope.service";

import type { ProjectSection } from "../output-markdown/output-markdown.types";
import type {
  CallidescopeCommandOptions,
  SyncDestinationsArguments,
} from "./callidescope.types";
import type {
  CallGraphResult,
  CallidescopeOutputFormat,
  ResolvedCallidescopeConfiguration,
  ResolvedCallidescopeMarkdownOutputConfiguration,
  ResolvedCallidescopeProjectReadmeConfiguration,
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
    private readonly markdownReportService: MarkdownReportService,
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
                report,
              }),
              path: path.join(root, PROJECT_README_NAME),
            },
          ];
    });
  }

  /**
   * Prints the run in the requested format.
   *
   * Markdown unless asked otherwise: it is the one rendering that reads well
   * in a terminal, pastes into an issue, and is already what the file
   * destinations write, so there is no second format to keep in step.
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
        previewCount:
          args.configuration.output.projectReadmes?.previewCount ??
          DEFAULT_PREVIEW_COUNT,
        result: args.result,
      }),
    );
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
        content: this.markdownReportService.renderRun({
          previewCount:
            args.configuration.output.projectReadmes?.previewCount ??
            DEFAULT_PREVIEW_COUNT,
          result: args.result,
        }),
        destination: markdown,
        result: args.result,
      })
    ) {
      stale.push(markdown.path);
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

  /** Parses `--format`, which decides what the run prints. */
  @Option({
    description: "What to print: markdown or json",
    flags: "-f, --format [format]",
  })
  public parseFormat(value: string | undefined): CallidescopeOutputFormat {
    return value === "json" ? "json" : "markdown";
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
        format: options.format ?? loaded.output.format,
        json:
          options.json === undefined
            ? loaded.output.json
            : { indentation: 2, path: options.json },
        markdown: this.resolveMarkdownDestination({
          configuration: loaded,
          markdown: options.markdown,
        }),
        projectReadmes: loaded.output.projectReadmes,
      },
    };

    const outcome = this.callidescopeService.trace({
      configuration,
      projectNames: options.projects ?? configuration.projects,
      workspaceRoot,
    });

    this.report({ configuration, result: outcome.result });

    const stale = this.syncDestinations({
      check: options.check ?? false,
      configuration,
      projectRoots: outcome.projectRoots,
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
