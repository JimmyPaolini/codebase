import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { BUNDLE_MARKERS } from "../bundle-markdown/bundle-markdown.constants";
import { BundleMarkdownService } from "../bundle-markdown/bundle-markdown.service";
import { ReportingService } from "../reporting/reporting.service";

import { BundlesService } from "./bundles.service";

import type {
  ReportableCommand,
  ReportMarkers,
  ReportOptions,
} from "../reporting/reporting.types";
import type { BundlesCommandOptions } from "./bundles.types";

/**
 * The bundle size report: what the build weighs, and where it grew.
 *
 * Runs on its own, or as one section among several when the aggregate
 * `reporting` command drives it.
 */
@Command({
  description: "Run the bundles command",
  name: "bundles",
})
@Injectable()
export class BundlesCommand extends CommandRunner implements ReportableCommand {
  // 🏗 Dependency Injection

  constructor(
    private readonly bundlesService: BundlesService,
    private readonly bundleMarkdownService: BundleMarkdownService,
    private readonly reportingService: ReportingService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(BundlesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  readonly reportLabel = "bundle sizes";

  readonly reportMarkers: ReportMarkers = BUNDLE_MARKERS;

  // 🔏 Private Methods

  // 🌎 Public Methods

  /** Parse the baseline directory holding a snapshot of the reports. */
  @Option({
    description: "Directory holding a baseline snapshot of the reports",
    flags: "--baseline [baseline]",
  })
  public parseBaseline(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Parse the run URL the baseline came from, linked from the headline. */
  @Option({
    description: "Run URL the baseline came from",
    flags: "--baseline-url [baselineUrl]",
  })
  public parseBaselineUrl(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Parse the markdown document the report is spliced into. */
  @Option({
    description: "Markdown document to splice the report into",
    flags: "--markdown [markdown]",
  })
  public parseMarkdown(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Parse the file the report is written to on its own. */
  @Option({
    description: "File to write the report to",
    flags: "--output [output]",
  })
  public parseOutput(value: unknown): string | undefined {
    return this.reportingService.readOptionalText(value);
  }

  /** Renders the report body from whatever the `bundlesize` target measured. */
  renderReport(options: ReportOptions): string {
    const collection = this.bundlesService.collect({
      baselineDirectory: options.baseline,
      workingDirectory: process.cwd(),
    });

    return this.bundleMarkdownService.renderSection({
      baselineUrl: options.baselineUrl,
      failures: collection.failures,
      rows: collection.rows,
    });
  }

  /** Renders this report alone, to wherever the flags point. */
  async run(
    _passedParameters: string[],
    options: BundlesCommandOptions,
  ): Promise<void> {
    await this.reportingService.emit(
      this,
      {
        baseline: this.reportingService.readOptionalText(options.baseline),
        baselineUrl: this.reportingService.readOptionalText(
          options.baselineUrl,
        ),
      },
      {
        markdown: this.reportingService.readOptionalText(options.markdown),
        output: this.reportingService.readOptionalText(options.output),
      },
    );
  }
}
