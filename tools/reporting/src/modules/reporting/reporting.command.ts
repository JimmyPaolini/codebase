import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { BundlesCommand } from "../bundles/bundles.command";

import { ReportingService } from "./reporting.service";

import type {
  ReportableCommand,
  ReportingCommandOptions,
} from "./reporting.types";

/**
 * CLI command that renders every internal report in one process.
 *
 * The individual reports remain available for targeted use. This exists so a
 * single Nx target can drive all of them: each `nx run` rebuilds the project
 * graph, so five targets cost five graph builds where one costs one.
 *
 * Because each report claims its own markers, pointing this at one document
 * splices every section into it side by side.
 */
@Command({
  description: "Run the reporting command",
  name: "reporting",
})
@Injectable()
export class ReportingCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly bundlesCommand: BundlesCommand,
    private readonly reportingService: ReportingService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(ReportingCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** The reports this aggregate drives, in a stable order. */
  private getReports(): ReportableCommand[] {
    return [this.bundlesCommand];
  }

  // 🌎 Public Methods

  /** Parse the baseline directory holding a snapshot to compare against. */
  @Option({
    description: "Directory holding a baseline snapshot to compare against",
    flags: "--baseline [baseline]",
  })
  public parseBaseline(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Parse the run URL the baseline came from. */
  @Option({
    description: "Run URL the baseline came from",
    flags: "--baseline-url [baselineUrl]",
  })
  public parseBaselineUrl(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Parse the markdown document every report is spliced into. */
  @Option({
    description: "Markdown document to splice every report into",
    flags: "--markdown [markdown]",
  })
  public parseMarkdown(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Render every report into the given destination. */
  async run(
    _passedParameters: string[],
    options: ReportingCommandOptions,
  ): Promise<void> {
    const reports = this.getReports();
    const reportOptions = {
      baseline: this.reportingService.readOptionalText(options.baseline),
      baselineUrl: this.reportingService.readOptionalText(options.baselineUrl),
    };
    const destination = {
      markdown: this.reportingService.readOptionalText(options.markdown),
      output: undefined,
    };

    this.logger.debug("📝 Rendering reports", undefined, {
      count: reports.length,
    });

    for (const report of reports) {
      await this.reportingService.emit(report, reportOptions, destination);
    }

    this.logger.info("📝 Rendered the reports", undefined, {
      count: reports.length,
    });
  }
}
