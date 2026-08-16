import { Inject, Injectable } from "@nestjs/common";
import { Command, CommandRunner, Option } from "nest-commander";

import { LoggerService } from "@codebase/logger";

import { DiscoveryService } from "../discovery/discovery.service";
import { JsonService } from "../json/json.service";
import { MarkdownService } from "../markdown/markdown.service";
import { PythonService } from "../python/python.service";
import { TypescriptService } from "../typescript/typescript.service";
import { WritingService } from "../writing/writing.service";

import { CodometerService } from "./codometer.service";

import type { CodometerCommandOptions } from "./codometer.types";

/**
 * CLI entry point for the repository measurement workflow.
 */
@Command({
  description: "Run the codometer command",
  name: "codometer",
})
@Injectable()
export class CodometerCommand extends CommandRunner {
  // 🏗 Dependency Injection

  constructor(
    @Inject(LoggerService) private readonly logger: LoggerService,
    @Inject(CodometerService) measureService?: CodometerService,
    @Inject(WritingService) writingService?: WritingService,
  ) {
    super();
    this.logger.setContext(CodometerCommand.name);
    this.measureService = measureService ?? this.createCodometerService();
    this.writingService = writingService ?? new WritingService();
  }

  // 🔐 Private Fields

  private readonly measureService: CodometerService;

  private readonly writingService: WritingService;

  // 🔑 Public Fields

  // 🔏 Private Methods

  /**
   * Create the codometer service graph used when no dependencies are injected.
   */
  private createCodometerService(): CodometerService {
    const discoveryService = new DiscoveryService();
    const typescriptService = new TypescriptService();
    const pythonService = new PythonService();
    const jsonService = new JsonService();
    const markdownService = new MarkdownService();

    return new CodometerService(
      discoveryService,
      typescriptService,
      pythonService,
      jsonService,
      markdownService,
    );
  }

  // 🌎 Public Methods

  /**
   * Parse the optional check mode flag from command-line input.
   *
   * The parser runs only when `--check` is present, and a flag carrying no
   * value arrives as `undefined` rather than `true`. Presence is therefore the
   * whole signal: reading `undefined` as "unset" is what silently turned check
   * mode back into write mode and let a stale README pass CI.
   */
  @Option({
    description: "Validate README badges without writing changes",
    flags: "--check",
  })
  public parseCheck(value: boolean | string | undefined): boolean {
    if (typeof value === "string") {
      return value.toLowerCase() !== "false";
    }

    return value ?? true;
  }

  /**
   * Parse the directory option from command-line input.
   */
  @Option({
    description: "Directory to analyze",
    flags: "-d, --directory [directory]",
  })
  public parseDirectory(value: string | undefined): string {
    return value ?? process.cwd();
  }

  /**
   * Parse the optional README option from command-line input.
   */
  @Option({
    description: "Optional README path to update with generated badges",
    flags: "-r, --readme [readme]",
  })
  public parseReadme(value: string | undefined): string | undefined {
    return value;
  }

  /**
   * Measure the repository and optionally update the README with generated badges.
   */
  async run(
    _passedParameters: string[],
    options: CodometerCommandOptions,
  ): Promise<void> {
    const directory = this.parseDirectory(options.directory);
    const statistics = this.measureService.measure(directory);
    // Already parsed by the Option decorator. Running `parseCheck` again here
    // would read the absent flag's `undefined` as presence and force check
    // mode on every run.
    const checkMode = options.check ?? false;
    const readmePath = this.parseReadme(options.readme);

    await Promise.resolve();

    if (readmePath) {
      const isCurrent = this.writingService.syncReadme(
        readmePath,
        statistics,
        checkMode,
      );

      if (checkMode) {
        if (!isCurrent) {
          console.error("README badges are out of date");
          process.exitCode = 1;
        }

        return;
      }

      return;
    }

    process.stdout.write(`${JSON.stringify(statistics, null, 2)}\n`);
  }
}
