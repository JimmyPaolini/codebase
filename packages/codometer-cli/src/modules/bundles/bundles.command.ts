import { readFile, writeFile } from "node:fs/promises";

import { Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { BundleMarkdownService } from "../bundle-markdown/bundle-markdown.service";

import { BundlesService } from "./bundles.service";

import type { BundlesCommandOptions } from "./bundles.types";

/**
 * CLI entry point for the bundle size report.
 *
 * Splices the rendered section into a markdown file rather than talking to a
 * forge. CI hands it a pull request description on the way through, which
 * keeps this package free of any one host's API.
 */
@Command({
  description: "Run the bundles command",
  name: "bundles",
})
@Injectable()
export class BundlesCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    private readonly bundlesService: BundlesService,
    private readonly bundleMarkdownService: BundleMarkdownService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext(BundlesCommand.name);
  }

  // 🔐 Private Fields

  // 🔑 Public Fields

  // 🔏 Private Methods

  /** Reads a markdown file, treating an absent one as empty. */
  private async readMarkdown(markdownPath: string): Promise<string> {
    try {
      const existing = await readFile(markdownPath, "utf8");
      return existing.trimEnd();
    } catch {
      return "";
    }
  }

  // 🌎 Public Methods

  /**
   * Parse the baseline directory holding a `main` snapshot of the reports.
   */
  @Option({
    description: "Directory holding a baseline snapshot of the reports",
    flags: "--baseline [baseline]",
  })
  public parseBaseline(value: string | undefined): string | undefined {
    return value === "" ? undefined : value;
  }

  /**
   * Parse the run URL the baseline came from, linked from the headline.
   */
  @Option({
    description: "Run URL the baseline came from",
    flags: "--baseline-url [baselineUrl]",
  })
  public parseBaselineUrl(value: string | undefined): string | undefined {
    return value === "" ? undefined : value;
  }

  /**
   * Parse the markdown file the section is spliced into.
   */
  @Option({
    description: "Markdown file to splice the section into",
    flags: "--markdown [markdown]",
  })
  public parseMarkdown(value: string | undefined): string | undefined {
    return value === "" ? undefined : value;
  }

  /**
   * Parse the file the section alone is written to.
   */
  @Option({
    description: "File to write the rendered section to",
    flags: "--output [output]",
  })
  public parseOutput(value: string | undefined): string | undefined {
    return value === "" ? undefined : value;
  }

  /**
   * Measure, render, and write.
   *
   * With no destination the section goes to standard output, which is what
   * makes the command inspectable before it is wired into anything.
   */
  async run(
    _passedParameters: string[],
    options: BundlesCommandOptions,
  ): Promise<void> {
    const section = this.bundleMarkdownService.renderSection({
      baselineUrl: options.baselineUrl,
      rows: this.bundlesService.collectRows({
        baselineDirectory: options.baseline,
        workingDirectory: process.cwd(),
      }),
    });

    if (options.output !== undefined) {
      await writeFile(options.output, `${section}\n`, "utf8");
      this.logger.log(`Wrote the bundles section to ${options.output}`);
    }

    if (options.markdown !== undefined) {
      const existing = await this.readMarkdown(options.markdown);
      const spliced = this.bundleMarkdownService.spliceSection(
        existing,
        section,
      );
      await writeFile(options.markdown, `${spliced}\n`, "utf8");
      this.logger.log(`Spliced the bundles section into ${options.markdown}`);
    }

    if (options.output === undefined && options.markdown === undefined) {
      process.stdout.write(`${section}\n`);
    }
  }
}
